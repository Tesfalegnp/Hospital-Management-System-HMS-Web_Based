import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { authenticateJWT } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import {
  listRoles,
  getRoleDetail,
  createRole,
  updateRole,
  toggleRoleStatus,
  deleteRole,
  getRolePermissions,
  assignPermissionToRole,
  removePermissionFromRole,
} from "../controllers/role.controller.js";
import {
  createRoleSchema,
  updateRoleSchema,
  toggleRoleStatusSchema,
  assignPermissionSchema,
} from "../validators/role.validator.js";

const router = Router();

// Require JWT authentication across all role management endpoints
router.use(authenticateJWT);

// List all roles
router.get(
  "/",
  requirePermission("system:role:view"),
  listRoles
);

// Get single role detail
router.get(
  "/:id",
  requirePermission("system:role:view"),
  getRoleDetail
);

// Create new custom role
router.post(
  "/",
  requirePermission("system:role:create"),
  validate(createRoleSchema),
  createRole
);

// Update role metadata & parent hierarchy
router.put(
  "/:id",
  requirePermission("system:role:update"),
  validate(updateRoleSchema),
  updateRole
);

// Toggle active/disabled status
router.patch(
  "/:id/status",
  requirePermission("system:role:disable"),
  validate(toggleRoleStatusSchema),
  toggleRoleStatus
);

// Soft delete custom role
router.delete(
  "/:id",
  requirePermission("system:role:disable"),
  deleteRole
);

// List permissions assigned to role
router.get(
  "/:id/permissions",
  requirePermission("system:role:view"),
  getRolePermissions
);

// Assign permission to role
router.post(
  "/:id/permissions",
  requirePermission("system:role:permission"),
  validate(assignPermissionSchema),
  assignPermissionToRole
);

// Remove permission from role
router.delete(
  "/:id/permissions/:permissionId",
  requirePermission("system:role:permission"),
  removePermissionFromRole
);

export default router;
