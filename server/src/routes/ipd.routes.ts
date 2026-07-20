import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { authenticateJWT, requireRoles } from "../middleware/auth.middleware.js";
import { Role } from "@prisma/client";
import {
  getWards,
  createWard,
  createBed,
  admitPatient,
  getActiveAdmissions,
  getAdmissionById,
  transferPatient,
  dischargePatient,
  logInpatientVitals,
  clearBedCleaning,
} from "../controllers/ipd.controller.js";
import {
  createWardSchema,
  createBedSchema,
  admitPatientSchema,
  logVitalsSchema,
  transferBedSchema,
  dischargePatientSchema,
} from "../validators/ipd.validator.js";

const router = Router();

// All IPD routes require JWT authentication
router.use(authenticateJWT);

// GET wards and beds list (accessible to Clinicians, Nurses, and Admins)
router.get(
  "/wards",
  requireRoles(Role.DOCTOR, Role.NURSE, Role.ADMIN, Role.SUPER_ADMIN),
  getWards
);

// POST configure ward (restricted to Admins)
router.post(
  "/wards",
  requireRoles(Role.ADMIN, Role.SUPER_ADMIN),
  validate(createWardSchema),
  createWard
);

// POST create bed in ward (restricted to Admins)
router.post(
  "/beds",
  requireRoles(Role.ADMIN, Role.SUPER_ADMIN),
  validate(createBedSchema),
  createBed
);

// POST clear bed cleaning state (accessible to Nurses and Admins)
router.post(
  "/beds/:id/clear",
  requireRoles(Role.NURSE, Role.ADMIN, Role.SUPER_ADMIN),
  clearBedCleaning
);

// POST admit patient
router.post(
  "/admissions",
  requireRoles(Role.NURSE, Role.ADMIN, Role.SUPER_ADMIN),
  validate(admitPatientSchema),
  admitPatient
);

// GET active admissions
router.get(
  "/admissions",
  requireRoles(Role.DOCTOR, Role.NURSE, Role.ADMIN, Role.SUPER_ADMIN),
  getActiveAdmissions
);

// GET detailed admission chart profile
router.get(
  "/admissions/:id",
  requireRoles(Role.DOCTOR, Role.NURSE, Role.ADMIN, Role.SUPER_ADMIN),
  getAdmissionById
);

// POST execute bed transfer
router.post(
  "/admissions/:id/transfer",
  requireRoles(Role.NURSE, Role.ADMIN, Role.SUPER_ADMIN),
  validate(transferBedSchema),
  transferPatient
);

// POST log periodic vitals signs
router.post(
  "/admissions/:id/vitals",
  requireRoles(Role.DOCTOR, Role.NURSE, Role.ADMIN, Role.SUPER_ADMIN),
  validate(logVitalsSchema),
  logInpatientVitals
);

// POST complete patient clinical discharge
router.post(
  "/admissions/:id/discharge",
  requireRoles(Role.DOCTOR, Role.NURSE, Role.ADMIN, Role.SUPER_ADMIN),
  validate(dischargePatientSchema),
  dischargePatient
);

export default router;
