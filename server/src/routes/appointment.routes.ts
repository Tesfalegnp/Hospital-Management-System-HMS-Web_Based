import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { authenticateJWT, requireRoles } from "../middleware/auth.middleware.js";
import { Role } from "@prisma/client";
import {
  createAppointment,
  rescheduleAppointment,
  cancelAppointment,
  getDoctorSchedule,
} from "../controllers/appointment.controller.js";
import {
  createAppointmentSchema,
  rescheduleAppointmentSchema,
  cancelAppointmentSchema,
  getDoctorScheduleSchema,
} from "../validators/appointment.validator.js";

const router = Router();

// All appointment routes require authentication
router.use(authenticateJWT);

// Create a new appointment (Restricted to Receptionist and Admin)
router.post(
  "/",
  requireRoles(Role.RECEPTIONIST, Role.ADMIN),
  validate(createAppointmentSchema),
  createAppointment
);

// Reschedule an appointment (Restricted to Receptionist and Admin)
router.patch(
  "/:id/reschedule",
  requireRoles(Role.RECEPTIONIST, Role.ADMIN),
  validate(rescheduleAppointmentSchema),
  rescheduleAppointment
);

// Cancel an appointment (Restricted to Receptionist and Admin)
router.patch(
  "/:id/cancel",
  requireRoles(Role.RECEPTIONIST, Role.ADMIN),
  validate(cancelAppointmentSchema),
  cancelAppointment
);

// Get doctor schedule for a specific day (Viewable by Doctor, Receptionist, Admin)
router.get(
  "/doctor-schedule/:doctorId",
  requireRoles(Role.DOCTOR, Role.RECEPTIONIST, Role.ADMIN),
  validate(getDoctorScheduleSchema),
  getDoctorSchedule
);

export default router;
