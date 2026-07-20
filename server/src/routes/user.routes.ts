import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { authenticateJWT, requireRoles } from "../middleware/auth.middleware.js";
import { Role } from "@prisma/client";
import {
  listUsers,
  createUser,
  editUser,
  resetUserPassword,
  getBranchesLookup,
  getDepartmentsLookup,
} from "../controllers/user.controller.js";
import {
  createUserSchema,
  updateUserSchema,
  resetPasswordSchema,
} from "../validators/user.validator.js";

const router = Router();

// Protect all user management routes
router.use(authenticateJWT);
router.use(requireRoles(Role.ADMIN, Role.SUPER_ADMIN));

// Lookup datasets for building forms (branch and department dropdown lists)
router.get("/lookups/branches", getBranchesLookup);
router.get("/lookups/departments", getDepartmentsLookup);

// Core CRUD Routing
router.get("/", listUsers);
router.post("/", validate(createUserSchema), createUser);
router.patch("/:id", validate(updateUserSchema), editUser);
router.post("/:id/reset-password", validate(resetPasswordSchema), resetUserPassword);

export default router;
