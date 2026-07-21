import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config/index.js";
import { AppError } from "../utils/AppError.js";
import { Role } from "@prisma/client";

/**
 * Middleware to authenticate request using JWT from HTTP-only cookies.
 */
export const authenticateJWT = (req: Request, res: Response, next: NextFunction) => {
  let token = req.cookies?.accessToken;

  if (!token && req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return next(new AppError("Authentication required", 401));
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as { id: string; role: Role };

    req.user = {
      id: decoded.id,
      role: decoded.role,
    };

    next();
  } catch (error) {
    next(new AppError("Invalid or expired session token", 401));
  }
};

/**
 * Curried route-guard middleware to enforce Role-Based Access Control (RBAC).
 */
export const requireRoles = (...allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError("Authentication required", 401));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError("Forbidden - Insufficient permissions", 403));
    }

    next();
  };
};
