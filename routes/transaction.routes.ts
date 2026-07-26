import { Router } from "express";
import multer from "multer";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "node:url";
import * as transactionController from "../controllers/transaction.controller.js";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// multer's plain `dest` option strips the original file extension, which left
// downloaded proofs without one (they'd open blank until you renamed them by
// hand). Use diskStorage instead so the saved filename keeps it.
const storage = multer.diskStorage({
  destination: path.join(__dirname, "../uploads"),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

const router = Router();

router.post("/", requireAuth, requireRole("CUSTOMER"), asyncHandler(transactionController.create));
router.get("/mine", requireAuth, asyncHandler(transactionController.listMine));
router.get("/points-balance", requireAuth, asyncHandler(transactionController.pointsBalance));
router.get("/event/:eventId", requireAuth, requireRole("ORGANIZER"), asyncHandler(transactionController.listForEvent));
router.get("/:id", requireAuth, asyncHandler(transactionController.getOne));
router.post("/:id/payment-proof", requireAuth, requireRole("CUSTOMER"), upload.single("proof"), asyncHandler(transactionController.uploadProof));
router.post("/:id/decision", requireAuth, requireRole("ORGANIZER"), asyncHandler(transactionController.decide));
router.post("/:id/cancel", requireAuth, requireRole("CUSTOMER"), asyncHandler(transactionController.cancel));

export default router;
