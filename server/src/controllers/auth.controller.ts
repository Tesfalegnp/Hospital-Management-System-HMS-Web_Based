import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { authService } from "../services/auth.service.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { config } from "../config/index.js";
import { AppError } from "../utils/AppError.js";

// Helper to remove password and refresh token before returning user objects
const sanitizeUser = (user: any) => {
  const { password, refreshToken, ...rest } = user;
  return rest;
};

// Cookie options helper
const getCookieOptions = (maxAge: number) => ({
  httpOnly: true,
  secure: config.NODE_ENV === "production",
  sameSite: "strict" as const,
  maxAge,
});

/**
 * Controller for managing authentication endpoints.
 */
export const registerUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.register({
    email: req.body.email as string,
    password: req.body.password as string,
    firstName: req.body.firstName as string,
    lastName: req.body.lastName as string,
    role: req.body.role,
  });

  res.status(201).json({
    success: true,
    message: "User registered successfully",
    data: sanitizeUser(user),
  });
});

export const loginUser = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const { user, accessToken, refreshToken } = await authService.login({
    email,
    password,
  });

  // Set tokens in secure HTTP-only cookies
  // Access Token: expires in 15 mins (15 * 60 * 1000)
  res.cookie("accessToken", accessToken, getCookieOptions(15 * 60 * 1000));
  // Refresh Token: expires in 7 days (7 * 24 * 60 * 60 * 1000)
  res.cookie("refreshToken", refreshToken, getCookieOptions(7 * 24 * 60 * 60 * 1000));

  res.status(200).json({
    success: true,
    message: "Logged in successfully",
    data: sanitizeUser(user),
  });
});

export const logoutUser = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.cookies;

  if (refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, config.JWT_REFRESH_SECRET) as { id: string };
      await authService.logout(decoded.id);
    } catch (error) {
      // Suppress token verification errors on logout to ensure cookies are still cleared
    }
  }

  // Clear both cookies
  res.clearCookie("accessToken", getCookieOptions(0));
  res.clearCookie("refreshToken", getCookieOptions(0));

  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
});

export const refreshSession = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken: oldRefreshToken } = req.cookies;

  if (!oldRefreshToken) {
    throw new AppError("No session token provided", 401);
  }

  const { user, accessToken, refreshToken } = await authService.refreshSession(oldRefreshToken);

  res.cookie("accessToken", accessToken, getCookieOptions(15 * 60 * 1000));
  res.cookie("refreshToken", refreshToken, getCookieOptions(7 * 24 * 60 * 60 * 1000));

  res.status(200).json({
    success: true,
    message: "Session refreshed successfully",
    data: sanitizeUser(user),
  });
});
