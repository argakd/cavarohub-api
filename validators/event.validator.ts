import { z } from "zod";

export const ticketTypeInput = z.object({
  name: z.string().min(1),
  priceIdr: z.number().int().nonnegative(),
  totalSeats: z.number().int().positive(),
});

const eventBaseSchema = z.object({
  name: z.string().min(3),
  description: z.string().min(10),
  location: z.string().min(2),
  categoryName: z.string().min(2),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  isPaid: z.boolean(),
  basePriceIdr: z.number().int().nonnegative().default(0),
  totalSeats: z.number().int().positive(),
  bannerImageUrl: z.string().url().optional(),
  ticketTypes: z.array(ticketTypeInput).optional(),
});

export const createEventSchema = eventBaseSchema.refine((data) => data.endDate > data.startDate, {
  message: "endDate must be after startDate",
  path: ["endDate"],
});

export const updateEventSchema = eventBaseSchema
  .omit({ ticketTypes: true })
  .partial()
  .refine((data) => !data.startDate || !data.endDate || data.endDate > data.startDate, {
    message: "endDate must be after startDate",
    path: ["endDate"],
  });

export const listEventsQuerySchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  location: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(50).default(12),
});

export const createVoucherSchema = z.object({
  code: z.string().min(3),
  discountType: z.enum(["PERCENTAGE", "FIXED"]),
  discountValue: z.number().int().positive(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  maxUses: z.number().int().positive().optional(),
}).refine((data) => data.endDate > data.startDate, {
  message: "endDate must be after startDate",
  path: ["endDate"],
});
