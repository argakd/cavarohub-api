import { Router } from "express";
import * as reviewController from "../controllers/review.controller";
import { requireAuth, requireRole } from "../middlewares/auth";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.post("/", requireAuth, requireRole("CUSTOMER"), asyncHandler(reviewController.create));
router.get("/organizers/:organizerId/summary", asyncHandler(reviewController.organizerSummary));

export default router;
