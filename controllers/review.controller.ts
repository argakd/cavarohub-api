import { Request, Response } from "express";
import * as reviewService from "../services/review.service.js";
import { createReviewSchema } from "../validators/review.validator.js";
import { AppError } from "../middlewares/errorHandler.js";

export async function create(req: Request, res: Response) {
  const parsed = createReviewSchema.parse(req.body);
  if (!req.user) throw new AppError(401, "Authentication required");
  const review = await reviewService.createReview({ ...parsed, userId: req.user.id });
  res.status(201).json(review);
}

export async function listForEvent(req: Request, res: Response) {
  const reviews = await reviewService.listReviewsForEvent(req.params.eventId as string);
  res.json(reviews);
}

export async function organizerSummary(req: Request, res: Response) {
  const summary = await reviewService.getOrganizerRatingSummary(req.params.organizerId as string);
  res.json(summary);
}
