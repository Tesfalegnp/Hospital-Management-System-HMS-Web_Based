import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { authenticateJWT, requireRoles } from "../middleware/auth.middleware.js";
import { Role } from "@prisma/client";
import {
  recordEncounter,
  updateEncounter,
  getPatientHistory,
} from "../controllers/consultation.controller.js";
import {
  recordConsultationSchema,
  updateConsultationSchema,
  queryHistorySchema,
} from "../validators/consultation.validator.js";

const router = Router();

// All consultation routes require authentication
router.use(authenticateJWT);

// Record a new clinical encounter/consultation (Restricted to Doctor and Admin)
router.post(
  "/",
  requireRoles(Role.DOCTOR, Role.ADMIN),
  validate(recordConsultationSchema),
  recordEncounter
);

// Update details of a consultation (Restricted to Doctor and Admin)
router.patch(
  "/:id",
  requireRoles(Role.DOCTOR, Role.ADMIN),
  validate(updateConsultationSchema),
  updateEncounter
);

// Retrieve previous consultations history for a patient (Viewable by Doctor, Nurse, Admin)
router.get(
  "/patient/:patientId",
  requireRoles(Role.DOCTOR, Role.NURSE, Role.ADMIN),
  validate(queryHistorySchema),
  getPatientHistory
);

export default router;
