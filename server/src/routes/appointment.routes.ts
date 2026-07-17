import { Router } from "express";
import { validate } from "../middleware/validate.js";
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

// Create a new appointment
router.post("/", validate(createAppointmentSchema), createAppointment);

// Reschedule an appointment
router.patch("/:id/reschedule", validate(rescheduleAppointmentSchema), rescheduleAppointment);

// Cancel an appointment
router.patch("/:id/cancel", validate(cancelAppointmentSchema), cancelAppointment);

// Get doctor schedule for a specific day
router.get("/doctor-schedule/:doctorId", validate(getDoctorScheduleSchema), getDoctorSchedule);

export default router;
