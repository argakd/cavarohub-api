import { z } from "zod";

export const createTransactionSchema = z.object({
  eventId: z.string().uuid(),
  items: z
    .array(
      z.object({
        ticketTypeId: z.string().uuid().optional(),
        quantity: z.number().int().positive(),
      }),
    )
    .min(1),
  voucherCode: z.string().optional(),
  pointsToUseIdr: z.number().int().nonnegative().default(0),
});

export const uploadProofSchema = z.object({
  paymentProofUrl: z.string().url(),
});

export const decideTransactionSchema = z.object({
  decision: z.enum(["ACCEPT", "REJECT"]),
});
