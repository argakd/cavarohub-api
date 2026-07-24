import { Router } from "express";
import * as eventController from "../controllers/event.controller.js";
import * as voucherController from "../controllers/voucher.controller.js";
import * as reviewController from "../controllers/review.controller.js";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.get("/categories", asyncHandler(eventController.categories));
router.get("/mine", requireAuth, requireRole("ORGANIZER"), asyncHandler(eventController.mine));
router.get("/", asyncHandler(eventController.list));
router.get("/:slug", asyncHandler(eventController.getBySlug));

router.post("/", requireAuth, requireRole("ORGANIZER"), asyncHandler(eventController.create));
router.patch("/:id", requireAuth, requireRole("ORGANIZER"), asyncHandler(eventController.update));
router.delete("/:id", requireAuth, requireRole("ORGANIZER"), asyncHandler(eventController.remove));

router.get("/:eventId/vouchers", requireAuth, requireRole("ORGANIZER"), asyncHandler(voucherController.list));
router.post("/:eventId/vouchers", requireAuth, requireRole("ORGANIZER"), asyncHandler(voucherController.create));

router.get("/:eventId/reviews", asyncHandler(reviewController.listForEvent));

export default router;
