import { Router } from "express";
import { validate } from "../middleware/validate.js";
import {
  registerUser,
  loginUser,
  logoutUser,
  refreshSession,
  getUserPermissions,
} from "../controllers/auth.controller.js";
import { authenticateJWT } from "../middleware/auth.middleware.js";
import { registerSchema, loginSchema } from "../validators/auth.validator.js";

const router = Router();

// Register a new user
router.post("/register", validate(registerSchema), registerUser);

// Login user
router.post("/login", validate(loginSchema), loginUser);

// Logout user
router.post("/logout", logoutUser);

// Refresh session token
router.post("/refresh", refreshSession);

// Get current effective permissions
router.get("/permissions", authenticateJWT, getUserPermissions);

export default router;
