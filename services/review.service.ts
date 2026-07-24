import { prisma } from "../lib/prisma.js";
import { AppError } from "../middlewares/errorHandler.js";
import { isEligibleForReview } from "../utils/review.eligibility.js";

export async function createReview(input: {
  userId: string;
  transactionId: string;
  rating: number;
  comment?: string;
}) {
  const transaction = await prisma.transaction.findUnique({
    where: { id: input.transactionId },
    include: { event: true, review: true },
  });
  if (!transaction) throw new AppError(404, "Transaction not found");
  if (transaction.userId !== input.userId) {
    throw new AppError(403, "You can only review your own transactions");
  }
  if (transaction.review) {
    throw new AppError(409, "This transaction has already been reviewed");
  }

  const eligibility = isEligibleForReview({
    transactionStatus: transaction.status,
    eventEndDate: transaction.event.endDate,
  });
  if (!eligibility.eligible) {
    throw new AppError(400, eligibility.reason ?? "Not eligible to review");
  }

  return prisma.review.create({
    data: {
      transactionId: transaction.id,
      eventId: transaction.eventId,
      userId: input.userId,
      rating: input.rating,
      comment: input.comment,
    },
  });
}

export async function listReviewsForEvent(eventId: string) {
  return prisma.review.findMany({
    where: { eventId },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getOrganizerRatingSummary(organizerId: string) {
  const reviews = await prisma.review.findMany({
    where: { event: { organizerId } },
    include: { user: { select: { id: true, name: true } }, event: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });

  const average =
    reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : null;

  return { averageRating: average, reviewCount: reviews.length, reviews };
}
