import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { authenticateJWT, requireRoles } from "../middleware/auth.middleware.js";
import { Role } from "@prisma/client";
import {
  getMedicines,
  createMedicine,
  getMedicineById,
  checkInteractions,
} from "../controllers/pharmacy.controller.js";
import {
  createMedicineSchema,
  checkInteractionsSchema,
} from "../validators/pharmacy.validator.js";

const router = Router();

// All pharmacy routes require JWT authentication
router.use(authenticateJWT);

// GET paginated catalog (Viewable by Doctors, Nurses, Pharmacists, and Admins)
router.get(
  "/medicines",
  requireRoles(Role.DOCTOR, Role.NURSE, Role.PHARMACIST, Role.ADMIN, Role.SUPER_ADMIN),
  getMedicines
);

// GET single medicine details (Viewable by Doctors, Nurses, Pharmacists, and Admins)
router.get(
  "/medicines/:id",
  requireRoles(Role.DOCTOR, Role.NURSE, Role.PHARMACIST, Role.ADMIN, Role.SUPER_ADMIN),
  getMedicineById
);

// POST new medicine to formulary (Restricted to Pharmacists and Admins)
router.post(
  "/medicines",
  requireRoles(Role.PHARMACIST, Role.ADMIN, Role.SUPER_ADMIN),
  validate(createMedicineSchema),
  createMedicine
);

// POST check drug-drug interactions (Viewable by Doctors, Nurses, Pharmacists, and Admins)
router.post(
  "/clinical-safety/check-interactions",
  requireRoles(Role.DOCTOR, Role.NURSE, Role.PHARMACIST, Role.ADMIN, Role.SUPER_ADMIN),
  validate(checkInteractionsSchema),
  checkInteractions
);

export default router;
