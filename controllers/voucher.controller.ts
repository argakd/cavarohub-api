import { Request, Response } from "express";
import * as voucherService from "../services/voucher.service.js";
import { createVoucherSchema } from "../validators/event.validator.js";
import { AppError } from "../middlewares/errorHandler.js";

export async function create(req: Request, res: Response) {
  const parsed = createVoucherSchema.parse(req.body);
  if (!req.user) throw new AppError(401, "Authentication required");
  const voucher = await voucherService.createVoucher({
    ...parsed,
    eventId: req.params.eventId as string,
    organizerId: req.user.id,
  });
  res.status(201).json(voucher);
}

export async function list(req: Request, res: Response) {
  const vouchers = await voucherService.listVouchers(req.params.eventId as string);
  res.json(vouchers);
}
