import { Router } from "express";
import * as authController from "../controllers/auth.controller.js";
import { requireAuth } from "../middlewares/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.post("/register", asyncHandler(authController.register));
router.post("/login", asyncHandler(authController.login));
router.post("/forgot-password", asyncHandler(authController.forgotPassword));
router.post("/reset-password", asyncHandler(authController.resetPassword));

router.get("/me", requireAuth, asyncHandler(authController.me));
router.patch("/me", requireAuth, asyncHandler(authController.updateMe));
router.post("/change-password", requireAuth, asyncHandler(authController.changePassword));

export default router;
