import { prisma } from "../lib/prisma";
import { AppError } from "../middlewares/errorHandler";
import { getEventOr404 } from "./event.service";

type CreateVoucherInput = {
  eventId: string;
  organizerId: string;
  code: string;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: number;
  startDate: Date;
  endDate: Date;
  maxUses?: number;
};

export async function createVoucher(input: CreateVoucherInput) {
  const event = await getEventOr404(input.eventId);
  if (event.organizerId !== input.organizerId) {
    throw new AppError(403, "Only the organizer who created this event can add vouchers");
  }

  const existing = await prisma.voucher.findUnique({
    where: { eventId_code: { eventId: input.eventId, code: input.code } },
  });
  if (existing) throw new AppError(409, "A voucher with this code already exists for this event");

  return prisma.voucher.create({
    data: {
      eventId: input.eventId,
      code: input.code,
      discountType: input.discountType,
      discountValue: input.discountValue,
      startDate: input.startDate,
      endDate: input.endDate,
      maxUses: input.maxUses,
    },
  });
}

export async function listVouchers(eventId: string) {
  return prisma.voucher.findMany({ where: { eventId }, orderBy: { createdAt: "desc" } });
}

export async function findActiveVoucher(eventId: string, code: string) {
  const now = new Date();
  const voucher = await prisma.voucher.findUnique({
    where: { eventId_code: { eventId, code } },
  });
  if (!voucher) throw new AppError(404, "Voucher not found");
  if (voucher.startDate > now || voucher.endDate < now) {
    throw new AppError(400, "Voucher is not currently active");
  }
  if (voucher.maxUses != null && voucher.usedCount >= voucher.maxUses) {
    throw new AppError(400, "Voucher has reached its usage limit");
  }
  return voucher;
}
