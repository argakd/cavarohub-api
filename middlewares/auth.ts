import { NextFunction, Request, Response } from "express";
import { verifyToken } from "../lib/jwt.js";

export type AuthUser = {
  id: string;
  role: "CUSTOMER" | "ORGANIZER";
};

declare global {

  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.header("authorization") ?? req.header("Authorization");
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : undefined;

  if (token) {
    const payload = verifyToken(token);
    if (payload) {
      req.user = { id: payload.id, role: payload.role };
    }
  }
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required. Sign in and include your token." });
  }
  next();
}

export function requireRole(...roles: AuthUser["role"][]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required." });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: `Requires role: ${roles.join(" or ")}` });
    }
    next();
  };
}
