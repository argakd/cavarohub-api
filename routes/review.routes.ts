import { Router } from "express";
import * as reviewController from "../controllers/review.controller.js";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.post("/", requireAuth, requireRole("CUSTOMER"), asyncHandler(reviewController.create));
router.get("/organizers/:organizerId/summary", asyncHandler(reviewController.organizerSummary));

export default router;
