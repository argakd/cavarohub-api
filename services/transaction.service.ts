import { Prisma, PrismaClient } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { sendMail } from "../lib/mailer.js";
import { AppError } from "../middlewares/errorHandler.js";
import { calculatePricing } from "../utils/pricing.js";
import {
  assertTransition,
  DECISION_WINDOW_MS,
  PAYMENT_WINDOW_MS,
  requiresRollback,
  TxStatus,
} from "../utils/transaction.statemachine.js";

type Tx = Prisma.TransactionClient | PrismaClient;

export async function getPointsBalance(db: Tx, userId: string, now = new Date()): Promise<number> {
  const rows = await db.pointLedger.findMany({
    where: { userId, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
    select: { amount: true },
  });
  return rows.reduce((sum, r) => sum + r.amount, 0);
}

type CreateTransactionInput = {
  userId: string;
  eventId: string;
  items: { ticketTypeId?: string; quantity: number }[];
  voucherCode?: string;
  pointsToUseIdr: number;
};

export async function createTransaction(input: CreateTransactionInput) {
  return prisma.$transaction(async (tx) => {
    const event = await tx.event.findUnique({
      where: { id: input.eventId },
      include: { ticketTypes: true },
    });
    if (!event) throw new AppError(404, "Event not found");
    if (event.status !== "PUBLISHED") throw new AppError(400, "Event is not open for registration");

    let subtotalIdr = 0;
    const itemsToCreate: { ticketTypeId?: string; quantity: number; unitPriceIdr: number }[] = [];
    let totalRequestedSeats = 0;

    if (event.ticketTypes.length > 0) {
      for (const item of input.items) {
        if (!item.ticketTypeId) throw new AppError(400, "ticketTypeId is required for this event");
        const ticketType = event.ticketTypes.find((t) => t.id === item.ticketTypeId);
        if (!ticketType) throw new AppError(404, `Ticket type ${item.ticketTypeId} not found for this event`);
        if (ticketType.availableSeats < item.quantity) {
          throw new AppError(409, `Not enough seats left for ticket type "${ticketType.name}"`);
        }
        subtotalIdr += ticketType.priceIdr * item.quantity;
        totalRequestedSeats += item.quantity;
        itemsToCreate.push({ ticketTypeId: ticketType.id, quantity: item.quantity, unitPriceIdr: ticketType.priceIdr });
      }
    } else {
      const quantity = input.items.reduce((s, i) => s + i.quantity, 0);
      if (event.availableSeats < quantity) throw new AppError(409, "Not enough seats left for this event");
      subtotalIdr = event.isPaid ? event.basePriceIdr * quantity : 0;
      totalRequestedSeats = quantity;
      itemsToCreate.push({ quantity, unitPriceIdr: event.isPaid ? event.basePriceIdr : 0 });
    }

    if (event.availableSeats < totalRequestedSeats) {
      throw new AppError(409, "Not enough seats left for this event");
    }

    let voucher = null;
    if (input.voucherCode) {
      const now = new Date();
      voucher = await tx.voucher.findUnique({ where: { eventId_code: { eventId: event.id, code: input.voucherCode } } });
      if (!voucher) throw new AppError(404, "Voucher not found");
      if (voucher.startDate > now || voucher.endDate < now) throw new AppError(400, "Voucher is not currently active");
      if (voucher.maxUses != null && voucher.usedCount >= voucher.maxUses) {
        throw new AppError(400, "Voucher has reached its usage limit");
      }
    }

    const pointsAvailableIdr = await getPointsBalance(tx, input.userId);

    const pricing = calculatePricing({
      subtotalIdr,
      voucher,
      coupon: null,
      pointsAvailableIdr,
      pointsToUseIdr: input.pointsToUseIdr,
    });

    if (event.ticketTypes.length > 0) {
      for (const item of itemsToCreate) {
        await tx.ticketType.update({
          where: { id: item.ticketTypeId! },
          data: { availableSeats: { decrement: item.quantity } },
        });
      }
    }
    await tx.event.update({
      where: { id: event.id },
      data: { availableSeats: { decrement: totalRequestedSeats } },
    });

    if (voucher) {
      await tx.voucher.update({ where: { id: voucher.id }, data: { usedCount: { increment: 1 } } });
    }

    if (pricing.pointsUsedIdr > 0) {
      await tx.pointLedger.create({
        data: {
          userId: input.userId,
          amount: -pricing.pointsUsedIdr,
          reason: "TRANSACTION_SPEND",
        },
      });
    }

    const now = new Date();
    const transaction = await tx.transaction.create({
      data: {
        userId: input.userId,
        eventId: event.id,
        status: "WAITING_FOR_PAYMENT",
        subtotalIdr: pricing.subtotalIdr,
        voucherId: voucher?.id,
        voucherDiscIdr: pricing.voucherDiscIdr,
        pointsUsedIdr: pricing.pointsUsedIdr,
        totalIdr: pricing.totalIdr,
        paymentDueAt: new Date(now.getTime() + PAYMENT_WINDOW_MS),
        items: { create: itemsToCreate },
      },
      include: { items: true, event: true, voucher: true },
    });

    return transaction;
  });
}

export async function getTransaction(id: string, requesterId: string, requesterRole: "CUSTOMER" | "ORGANIZER") {
  const transaction = await prisma.transaction.findUnique({
    where: { id },
    include: { items: { include: { ticketType: true } }, event: true, user: { select: { id: true, name: true, email: true } } },
  });
  if (!transaction) throw new AppError(404, "Transaction not found");

  const isOwner = transaction.userId === requesterId;
  const isOrganizer = requesterRole === "ORGANIZER" && transaction.event.organizerId === requesterId;
  if (!isOwner && !isOrganizer) throw new AppError(403, "Not authorized to view this transaction");

  return transaction;
}

export async function listMyTransactions(userId: string) {
  return prisma.transaction.findMany({
    where: { userId },
    include: { event: true, items: true, review: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function listEventTransactions(eventId: string, organizerId: string) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw new AppError(404, "Event not found");
  if (event.organizerId !== organizerId) throw new AppError(403, "Not authorized");

  return prisma.transaction.findMany({
    where: { eventId },
    include: { user: { select: { id: true, name: true, email: true } }, items: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function uploadPaymentProof(transactionId: string, userId: string, paymentProofUrl: string) {
  return prisma.$transaction(async (tx) => {
    const transaction = await tx.transaction.findUnique({ where: { id: transactionId } });
    if (!transaction) throw new AppError(404, "Transaction not found");
    if (transaction.userId !== userId) throw new AppError(403, "Not authorized");
    if (transaction.status !== "WAITING_FOR_PAYMENT") {
      throw new AppError(400, `Cannot upload proof for a transaction in status ${transaction.status}`);
    }
    if (new Date() >= transaction.paymentDueAt) {
      throw new AppError(400, "Payment window has expired");
    }

    assertTransition(transaction.status as TxStatus, "WAITING_FOR_ADMIN_CONFIRMATION");

    return tx.transaction.update({
      where: { id: transactionId },
      data: {
        paymentProofUrl,
        status: "WAITING_FOR_ADMIN_CONFIRMATION",
        decisionDueAt: new Date(Date.now() + DECISION_WINDOW_MS),
      },
      include: { items: { include: { ticketType: true } }, event: true, user: { select: { id: true, name: true, email: true } } },
    });
  });
}

async function rollbackTransaction(tx: Tx, transactionId: string) {
  const transaction = await tx.transaction.findUnique({ where: { id: transactionId }, include: { items: true } });
  if (!transaction) return;

  for (const item of transaction.items) {
    if (item.ticketTypeId) {
      await tx.ticketType.update({
        where: { id: item.ticketTypeId },
        data: { availableSeats: { increment: item.quantity } },
      });
    }
  }
  const totalSeats = transaction.items.reduce((s, i) => s + i.quantity, 0);
  await tx.event.update({ where: { id: transaction.eventId }, data: { availableSeats: { increment: totalSeats } } });

  if (transaction.voucherId) {
    await tx.voucher.update({ where: { id: transaction.voucherId }, data: { usedCount: { decrement: 1 } } });
  }
  if (transaction.couponId) {
    await tx.coupon.update({ where: { id: transaction.couponId }, data: { isUsed: false } });
  }
  if (transaction.pointsUsedIdr > 0) {
    await tx.pointLedger.create({
      data: { userId: transaction.userId, amount: transaction.pointsUsedIdr, reason: "TRANSACTION_REFUND" },
    });
  }
}

export async function decideTransaction(
  transactionId: string,
  organizerId: string,
  decision: "ACCEPT" | "REJECT",
) {
  const updated = await prisma.$transaction(async (tx) => {
    const transaction = await tx.transaction.findUnique({
      where: { id: transactionId },
      include: { event: true, user: true },
    });
    if (!transaction) throw new AppError(404, "Transaction not found");
    if (transaction.event.organizerId !== organizerId) throw new AppError(403, "Not authorized");
    if (transaction.status !== "WAITING_FOR_ADMIN_CONFIRMATION") {
      throw new AppError(400, `Cannot decide a transaction in status ${transaction.status}`);
    }

    const nextStatus: TxStatus = decision === "ACCEPT" ? "DONE" : "REJECTED";
    assertTransition(transaction.status as TxStatus, nextStatus);

    if (requiresRollback(nextStatus)) {
      await rollbackTransaction(tx, transactionId);
    }

    const result = await tx.transaction.update({
      where: { id: transactionId },
      data: { status: nextStatus, decidedAt: new Date() },
    });

    return { result, customerEmail: transaction.user.email, customerName: transaction.user.name, eventName: transaction.event.name };
  });

  const subject =
    updated.result.status === "DONE"
      ? `Your order for "${updated.eventName}" was accepted`
      : `Your order for "${updated.eventName}" was rejected`;
  const text =
    updated.result.status === "DONE"
      ? `Hi ${updated.customerName},\n\nGood news — the organizer accepted your payment for "${updated.eventName}". You're all set to attend!`
      : `Hi ${updated.customerName},\n\nThe organizer rejected your payment for "${updated.eventName}". Your seats, any voucher use, and any points you spent have been restored.`;

  sendMail({ to: updated.customerEmail, subject, text }).catch((err) => {
    console.error("[mailer] failed to send transaction decision email", err);
  });

  return updated.result;
}

export async function cancelTransaction(transactionId: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    const transaction = await tx.transaction.findUnique({ where: { id: transactionId } });
    if (!transaction) throw new AppError(404, "Transaction not found");
    if (transaction.userId !== userId) throw new AppError(403, "Not authorized");
    if (transaction.status !== "WAITING_FOR_PAYMENT") {
      throw new AppError(400, "Only transactions still waiting for payment can be canceled by the customer");
    }
    assertTransition(transaction.status as TxStatus, "CANCELED");
    await rollbackTransaction(tx, transactionId);
    return tx.transaction.update({
      where: { id: transactionId },
      data: { status: "CANCELED", decidedAt: new Date() },
      include: { items: { include: { ticketType: true } }, event: true, user: { select: { id: true, name: true, email: true } } },
    });
  });
}

/** Called by the cron job: expire unpaid transactions past their 2h window. */
export async function expireOverdueTransactions() {
  const now = new Date();
  const overdue = await prisma.transaction.findMany({
    where: { status: "WAITING_FOR_PAYMENT", paymentDueAt: { lt: now } },
    select: { id: true },
  });

  for (const { id } of overdue) {
    await prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.findUnique({ where: { id } });
      if (!transaction || transaction.status !== "WAITING_FOR_PAYMENT") return;
      assertTransition(transaction.status as TxStatus, "EXPIRED");
      await rollbackTransaction(tx, id);
      await tx.transaction.update({ where: { id }, data: { status: "EXPIRED" } });
    });
  }
  return overdue.length;
}

/** Called by the cron job: auto-cancel transactions the organizer never decided on within 3 days. */
export async function autoCancelUndecidedTransactions() {
  const now = new Date();
  const overdue = await prisma.transaction.findMany({
    where: { status: "WAITING_FOR_ADMIN_CONFIRMATION", decisionDueAt: { lt: now } },
    select: { id: true },
  });

  for (const { id } of overdue) {
    await prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.findUnique({ where: { id } });
      if (!transaction || transaction.status !== "WAITING_FOR_ADMIN_CONFIRMATION") return;
      assertTransition(transaction.status as TxStatus, "CANCELED");
      await rollbackTransaction(tx, id);
      await tx.transaction.update({ where: { id }, data: { status: "CANCELED", decidedAt: new Date() } });
    });
  }
  return overdue.length;
}
