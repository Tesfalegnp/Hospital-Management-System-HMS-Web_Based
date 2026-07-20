import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { authenticateJWT, requireRoles } from "../middleware/auth.middleware.js";
import { Role } from "@prisma/client";
import {
  createOrder,
  getQueue,
  collectSpecimen,
  enterResults,
  validateResults,
  cancelOrder,
  getHistory,
} from "../controllers/lab.controller.js";
import {
  createLabOrderSchema,
  enterLabResultsSchema,
} from "../validators/lab.validator.js";

const router = Router();

// All laboratory routes require authentication
router.use(authenticateJWT);

// Place a new lab order (Restricted to Doctors and Admins)
router.post(
  "/order",
  requireRoles(Role.DOCTOR, Role.ADMIN),
  validate(createLabOrderSchema),
  createOrder
);

// Retrieve pending orders queue (Restricted to Lab Techs and Admins)
router.get(
  "/queue",
  requireRoles(Role.LAB_TECHNICIAN, Role.ADMIN),
  getQueue
);

// Record specimen collection
router.post(
  "/collect-specimen/:id",
  requireRoles(Role.LAB_TECHNICIAN, Role.NURSE, Role.DOCTOR, Role.ADMIN),
  collectSpecimen
);

// Enter lab results with findings/data (Restricted to Lab Techs and Admins)
router.post(
  "/enter-results/:id",
  requireRoles(Role.LAB_TECHNICIAN, Role.ADMIN),
  validate(enterLabResultsSchema),
  enterResults
);

// Validate and release results (Restricted to Doctors and Admins)
router.post(
  "/validate-results/:id",
  requireRoles(Role.DOCTOR, Role.ADMIN),
  validateResults
);

// Cancel lab order (Restricted to Doctors and Admins)
router.post(
  "/cancel/:id",
  requireRoles(Role.DOCTOR, Role.ADMIN),
  cancelOrder
);

// Retrieve patient history (Viewable by Doctors, Nurses, Lab Techs, and Admins)
router.get(
  "/patient/:patientId",
  requireRoles(Role.DOCTOR, Role.NURSE, Role.LAB_TECHNICIAN, Role.ADMIN),
  getHistory
);

export default router;
