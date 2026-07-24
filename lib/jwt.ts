import jwt from "jsonwebtoken";
import { env } from "../config/env";

export type JwtPayload = { id: string; role: "CUSTOMER" | "ORGANIZER" };

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn as jwt.SignOptions["expiresIn"] });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, env.jwtSecret);
    if (typeof decoded === "object" && decoded && "id" in decoded && "role" in decoded) {
      return { id: String(decoded.id), role: decoded.role as JwtPayload["role"] };
    }
    return null;
  } catch {
    return null;
  }
}
