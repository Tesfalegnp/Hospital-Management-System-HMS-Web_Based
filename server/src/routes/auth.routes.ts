import { Router } from "express";
import { validate } from "../middleware/validate.js";
import {
  registerUser,
  loginUser,
  logoutUser,
  refreshSession,
} from "../controllers/auth.controller.js";
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

export default router;
