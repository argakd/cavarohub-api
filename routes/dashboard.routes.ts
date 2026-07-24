import { Router } from "express";
import * as dashboardController from "../controllers/dashboard.controller";
import { requireAuth, requireRole } from "../middlewares/auth";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.get("/stats", requireAuth, requireRole("ORGANIZER"), asyncHandler(dashboardController.stats));

export default router;
