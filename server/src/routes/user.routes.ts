import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { authenticateJWT, requireRoles } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
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
import {
  getUserRoles,
  assignUserRole,
  revokeUserRole,
  getUserEffectivePermissions,
} from "../controllers/user-role.controller.js";
import { assignUserRoleSchema } from "../validators/user-role.validator.js";

const router = Router();

// Protect all user management routes
router.use(authenticateJWT);
router.use(requireRoles(Role.ADMIN, Role.SUPER_ADMIN));

// Lookup datasets for building forms (branch and department dropdown lists)
router.get("/lookups/branches", getBranchesLookup);
router.get("/lookups/departments", getDepartmentsLookup);

// Core CRUD Routing guarded with permission middleware
router.get("/", requirePermission("system:user:view"), listUsers);
router.post("/", requirePermission("system:user:create"), validate(createUserSchema), createUser);
router.patch("/:id", requirePermission("system:user:edit"), validate(updateUserSchema), editUser);
router.post("/:id/reset-password", requirePermission("system:user:edit"), validate(resetPasswordSchema), resetUserPassword);

// User Role Assignment Routing
router.get("/:id/roles", requirePermission("system:user-role:view"), getUserRoles);
router.post("/:id/roles", requirePermission("system:user-role:create"), validate(assignUserRoleSchema), assignUserRole);
router.delete("/:id/roles/:userRoleId", requirePermission("system:user-role:update"), revokeUserRole);
router.get("/:id/effective-permissions", requirePermission("system:user-role:permission-preview"), getUserEffectivePermissions);

export default router;
