import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { authenticateJWT, requireRoles } from "../middleware/auth.middleware.js";
import { Role } from "@prisma/client";
import {
  createPrescription,
  getPrescriptionQueue,
  getPrescriptionById,
  dispensePrescription,
} from "../controllers/prescription.controller.js";
import {
  createPrescriptionSchema,
  dispensePrescriptionSchema,
} from "../validators/prescription.validator.js";

const router = Router();

// All prescription routes require authentication
router.use(authenticateJWT);

// GET prescription queue (pharmacists, doctors, and admins)
router.get(
  "/",
  requireRoles(Role.PHARMACIST, Role.DOCTOR, Role.ADMIN, Role.SUPER_ADMIN),
  getPrescriptionQueue
);

// GET specific prescription details
router.get(
  "/:id",
  requireRoles(Role.PHARMACIST, Role.DOCTOR, Role.ADMIN, Role.SUPER_ADMIN),
  getPrescriptionById
);

// POST issue new prescription (restricted to doctors and admins)
router.post(
  "/",
  requireRoles(Role.DOCTOR, Role.ADMIN, Role.SUPER_ADMIN),
  validate(createPrescriptionSchema),
  createPrescription
);

// POST execute dispensing (restricted to pharmacists and admins)
router.post(
  "/:id/dispense",
  requireRoles(Role.PHARMACIST, Role.ADMIN, Role.SUPER_ADMIN),
  validate(dispensePrescriptionSchema),
  dispensePrescription
);

export default router;
