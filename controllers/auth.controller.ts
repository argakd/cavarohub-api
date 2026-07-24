import { Request, Response } from "express";
import * as authService from "../services/auth.service";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  updateProfileSchema,
} from "../validators/auth.validator";
import { AppError } from "../middlewares/errorHandler";

export async function register(req: Request, res: Response) {
  const parsed = registerSchema.parse(req.body);
  const result = await authService.register(parsed);
  res.status(201).json(result);
}

export async function login(req: Request, res: Response) {
  const parsed = loginSchema.parse(req.body);
  const result = await authService.login(parsed.email, parsed.password);
  res.json(result);
}

export async function me(req: Request, res: Response) {
  if (!req.user) throw new AppError(401, "Authentication required");
  const user = await authService.getProfile(req.user.id);
  res.json(user);
}

export async function updateMe(req: Request, res: Response) {
  if (!req.user) throw new AppError(401, "Authentication required");
  const parsed = updateProfileSchema.parse(req.body);
  const user = await authService.updateProfile(req.user.id, parsed);
  res.json(user);
}

export async function changePassword(req: Request, res: Response) {
  if (!req.user) throw new AppError(401, "Authentication required");
  const parsed = changePasswordSchema.parse(req.body);
  await authService.changePassword(req.user.id, parsed.currentPassword, parsed.newPassword);
  res.json({ message: "Password changed." });
}

export async function forgotPassword(req: Request, res: Response) {
  const parsed = forgotPasswordSchema.parse(req.body);
  const result = await authService.forgotPassword(parsed.email);
  res.json(result);
}

export async function resetPassword(req: Request, res: Response) {
  const parsed = resetPasswordSchema.parse(req.body);
  await authService.resetPassword(parsed.token, parsed.newPassword);
  res.json({ message: "Password reset." });
}
