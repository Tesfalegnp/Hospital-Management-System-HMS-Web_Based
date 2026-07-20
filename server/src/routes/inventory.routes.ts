import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { authenticateJWT, requireRoles } from "../middleware/auth.middleware.js";
import { Role } from "@prisma/client";
import {
  getBranchInventory,
  recordIntake,
  adjustStock,
  transferStock,
  getSafetyReports,
  getLedgerLogs,
} from "../controllers/inventory.controller.js";
import {
  stockIntakeSchema,
  stockAdjustmentSchema,
  stockTransferSchema,
} from "../validators/inventory.validator.js"; // Wait! Make sure relative path matches (.js at runtime, but ts file import can be without extension or with .js in ES modules. In the workspace, validators use .js at compile imports. Let's make sure!).

const router = Router();

// All inventory routes require authentication
router.use(authenticateJWT);

// GET current stock list in a branch (Viewable by Doctors, Pharmacists, and Admins)
router.get(
  "/stock",
  requireRoles(Role.DOCTOR, Role.PHARMACIST, Role.ADMIN, Role.SUPER_ADMIN),
  getBranchInventory
);

// POST record new stock intake (Restricted to Pharmacists and Admins)
router.post(
  "/intake",
  requireRoles(Role.PHARMACIST, Role.ADMIN, Role.SUPER_ADMIN),
  validate(stockIntakeSchema),
  recordIntake
);

// POST adjust stock levels manually (Restricted to Pharmacists and Admins)
router.post(
  "/adjust",
  requireRoles(Role.PHARMACIST, Role.ADMIN, Role.SUPER_ADMIN),
  validate(stockAdjustmentSchema),
  adjustStock
);

// POST transfer stock to another branch (Restricted to Pharmacists and Admins)
router.post(
  "/transfer",
  requireRoles(Role.PHARMACIST, Role.ADMIN, Role.SUPER_ADMIN),
  validate(stockTransferSchema),
  transferStock
);

// GET low stock and expired safety reports (Viewable by Pharmacists and Admins)
router.get(
  "/reports",
  requireRoles(Role.PHARMACIST, Role.ADMIN, Role.SUPER_ADMIN),
  getSafetyReports
);

// GET audit transactions ledger log (Restricted to Pharmacists and Admins)
router.get(
  "/ledger",
  requireRoles(Role.PHARMACIST, Role.ADMIN, Role.SUPER_ADMIN),
  getLedgerLogs
);

export default router;
