import { Router } from "express";
import * as dashboardController from "../controllers/dashboard.controller.js";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.get("/stats", requireAuth, requireRole("ORGANIZER"), asyncHandler(dashboardController.stats));

export default router;
