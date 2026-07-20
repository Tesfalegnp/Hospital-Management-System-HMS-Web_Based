import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { authenticateJWT, requireRoles } from "../middleware/auth.middleware.js";
import { Role } from "@prisma/client";
import {
  getPatientAllergies,
  addPatientAllergy,
  checkPatientAllergies,
} from "../controllers/patient-allergy.controller.js";
import { createPatientAllergySchema } from "../validators/pharmacy.validator.js";

const router = Router();

// All patient allergy routes require authentication
router.use(authenticateJWT);

// GET patient allergy chart (Viewable by Doctors, Nurses, Pharmacists, and Admins)
router.get(
  "/:patientId/allergies",
  requireRoles(Role.DOCTOR, Role.NURSE, Role.PHARMACIST, Role.ADMIN, Role.SUPER_ADMIN),
  getPatientAllergies
);

// POST append allergy marker to chart (Restricted to Doctors, Nurses, and Admins)
router.post(
  "/:patientId/allergies",
  requireRoles(Role.DOCTOR, Role.NURSE, Role.ADMIN, Role.SUPER_ADMIN),
  validate(createPatientAllergySchema),
  addPatientAllergy
);

// POST check patient allergies against draft meds (Viewable by Doctors, Nurses, and Admins)
router.post(
  "/:patientId/allergies/check",
  requireRoles(Role.DOCTOR, Role.NURSE, Role.ADMIN, Role.SUPER_ADMIN),
  checkPatientAllergies
);

export default router;
