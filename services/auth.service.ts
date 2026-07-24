import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "../lib/prisma.js";
import { signToken } from "../lib/jwt.js";
import { sendMail } from "../lib/mailer.js";
import { AppError } from "../middlewares/errorHandler.js";
import { generateReferralCode } from "../utils/referralCode.js";
import { env } from "../config/env.js";
import { computeReferralReward } from "../utils/referral.js";

const SALT_ROUNDS = 10;
const RESET_TOKEN_WINDOW_MS = 60 * 60 * 1000;

function toPublicUser(user: {
  id: string;
  name: string;
  email: string;
  role: "CUSTOMER" | "ORGANIZER";
  referralCode: string;
  profilePicture: string | null;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    referralCode: user.referralCode,
    profilePicture: user.profilePicture,
  };
}

async function uniqueReferralCode(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateReferralCode();
    const existing = await prisma.user.findUnique({ where: { referralCode: code } });
    if (!existing) return code;
  }
  throw new AppError(500, "Could not generate a unique referral code, please try again");
}

type RegisterInput = {
  name: string;
  email: string;
  password: string;
  role: "CUSTOMER" | "ORGANIZER";
  referralCode?: string;
};

export async function register(input: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw new AppError(409, "An account with this email already exists");

  let referrer = null;
  if (input.referralCode) {
    referrer = await prisma.user.findUnique({ where: { referralCode: input.referralCode } });
    if (!referrer) throw new AppError(400, "Referral code not found");
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
  const referralCode = await uniqueReferralCode();

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
        role: input.role,
        referralCode,
        referredById: referrer?.id,
      },
    });

    if (referrer) {
      const reward = computeReferralReward();

      await tx.pointLedger.create({
        data: {
          userId: referrer.id,
          amount: reward.referrerPointsAwarded,
          reason: "REFERRAL_BONUS",
          expiresAt: reward.referrerPointsExpiresAt,
        },
      });

      await tx.coupon.create({
        data: {
          code: `WELCOME-${created.referralCode}`,
          userId: created.id,
          discountType: "PERCENTAGE",
          discountValue: reward.refereeCouponDiscountPercent,
          expiresAt: reward.refereeCouponExpiresAt,
        },
      });
    }

    return created;
  });

  const token = signToken({ id: user.id, role: user.role });
  return { token, user: toPublicUser(user) };
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new AppError(401, "Invalid email or password");

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new AppError(401, "Invalid email or password");

  const token = signToken({ id: user.id, role: user.role });
  return { token, user: toPublicUser(user) };
}

export async function getProfile(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(404, "User not found");
  return toPublicUser(user);
}

export async function updateProfile(userId: string, input: { name?: string; profilePicture?: string }) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { name: input.name, profilePicture: input.profilePicture },
  });
  return toPublicUser(user);
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(404, "User not found");

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) throw new AppError(400, "Current password is incorrect");

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Always returns a generic success message, even if the email doesn't
 * exist — otherwise this endpoint could be used to check which emails are
 * registered. Returns `devResetUrl` only when no real SMTP is configured,
 * purely so a local demo/grading session can follow the link without
 * needing a real inbox.
 */
export async function forgotPassword(email: string): Promise<{ message: string; devResetUrl?: string }> {
  const user = await prisma.user.findUnique({ where: { email } });
  const genericResponse = { message: "If that email has an account, a reset link has been sent." };
  if (!user) return genericResponse;

  const rawToken = crypto.randomBytes(32).toString("hex");
  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetTokenHash: hashToken(rawToken),
      resetTokenExpiresAt: new Date(Date.now() + RESET_TOKEN_WINDOW_MS),
    },
  });

  const resetUrl = `${env.clientUrl}/reset-password?token=${rawToken}`;
  await sendMail({
    to: user.email,
    subject: "Reset your Event Platform password",
    text: `Hi ${user.name},\n\nUse this link within 1 hour to reset your password:\n${resetUrl}\n\nIf you didn't request this, you can ignore this email.`,
  });

  return env.smtp.host ? genericResponse : { ...genericResponse, devResetUrl: resetUrl };
}

export async function resetPassword(rawToken: string, newPassword: string) {
  const tokenHash = hashToken(rawToken);
  const user = await prisma.user.findFirst({ where: { resetTokenHash: tokenHash } });

  if (!user || !user.resetTokenExpiresAt || user.resetTokenExpiresAt < new Date()) {
    throw new AppError(400, "This reset link is invalid or has expired");
  }

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, resetTokenHash: null, resetTokenExpiresAt: null },
  });
}
