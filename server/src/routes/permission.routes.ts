import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { authenticateJWT } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import {
  listPermissions,
  getPermissionDetail,
  createPermission,
  updatePermission,
  togglePermissionStatus,
} from "../controllers/permission.controller.js";
import {
  createPermissionSchema,
  updatePermissionSchema,
  togglePermissionStatusSchema,
} from "../validators/permission.validator.js";

const router = Router();

// Require JWT authentication across all permission management endpoints
router.use(authenticateJWT);

// List permissions
router.get(
  "/",
  requirePermission("system:permission:view"),
  listPermissions
);

// Get single permission detail
router.get(
  "/:id",
  requirePermission("system:permission:view"),
  getPermissionDetail
);

// Create new permission
router.post(
  "/",
  requirePermission("system:permission:create"),
  validate(createPermissionSchema),
  createPermission
);

// Update permission metadata
router.put(
  "/:id",
  requirePermission("system:permission:update"),
  validate(updatePermissionSchema),
  updatePermission
);

// Toggle active/disabled status
router.patch(
  "/:id/status",
  requirePermission("system:permission:disable"),
  validate(togglePermissionStatusSchema),
  togglePermissionStatus
);

export default router;
