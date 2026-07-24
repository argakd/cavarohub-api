import { Request, Response } from "express";
import * as transactionService from "../services/transaction.service";
import { createTransactionSchema, decideTransactionSchema, uploadProofSchema } from "../validators/transaction.validator";
import { AppError } from "../middlewares/errorHandler";
import { prisma } from "../lib/prisma";

export async function create(req: Request, res: Response) {
  const parsed = createTransactionSchema.parse(req.body);
  if (!req.user) throw new AppError(401, "Authentication required");
  const transaction = await transactionService.createTransaction({ ...parsed, userId: req.user.id });
  res.status(201).json(transaction);
}

export async function getOne(req: Request, res: Response) {
  if (!req.user) throw new AppError(401, "Authentication required");
  const transaction = await transactionService.getTransaction(req.params.id as string, req.user.id, req.user.role);
  res.json(transaction);
}

export async function listMine(req: Request, res: Response) {
  if (!req.user) throw new AppError(401, "Authentication required");
  const transactions = await transactionService.listMyTransactions(req.user.id);
  res.json(transactions);
}

export async function listForEvent(req: Request, res: Response) {
  if (!req.user) throw new AppError(401, "Authentication required");
  const transactions = await transactionService.listEventTransactions(req.params.eventId as string, req.user.id);
  res.json(transactions);
}

export async function uploadProof(req: Request, res: Response) {
  if (!req.user) throw new AppError(401, "Authentication required");

  const uploadedFile = (req as Request & { file?: Express.Multer.File }).file;
  const paymentProofUrl = uploadedFile ? `/uploads/${uploadedFile.filename}` : uploadProofSchema.parse(req.body).paymentProofUrl;

  const transaction = await transactionService.uploadPaymentProof(req.params.id as string, req.user.id, paymentProofUrl);
  res.json(transaction);
}

export async function decide(req: Request, res: Response) {
  const parsed = decideTransactionSchema.parse(req.body);
  if (!req.user) throw new AppError(401, "Authentication required");
  const transaction = await transactionService.decideTransaction(req.params.id as string, req.user.id, parsed.decision);
  res.json(transaction);
}

export async function cancel(req: Request, res: Response) {
  if (!req.user) throw new AppError(401, "Authentication required");
  const transaction = await transactionService.cancelTransaction(req.params.id as string, req.user.id);
  res.json(transaction);
}

export async function pointsBalance(req: Request, res: Response) {
  if (!req.user) throw new AppError(401, "Authentication required");
  const balanceIdr = await transactionService.getPointsBalance(prisma, req.user.id);
  res.json({ balanceIdr });
}
