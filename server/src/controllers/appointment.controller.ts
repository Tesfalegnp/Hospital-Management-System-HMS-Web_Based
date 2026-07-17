import { Request, Response } from "express";
import { appointmentService } from "../services/appointment.service.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

/**
 * Controller for managing clinical appointments.
 */
export const createAppointment = asyncHandler(async (req: Request, res: Response) => {
  const appointment = await appointmentService.createAppointment({
    patientId: req.body.patientId as string,
    doctorId: req.body.doctorId as string,
    branchId: req.body.branchId as string,
    departmentId: (req.body.departmentId as string) || undefined,
    appointmentDate: req.body.appointmentDate as string | Date,
    startTime: req.body.startTime as string | Date,
    endTime: req.body.endTime as string | Date,
    reason: (req.body.reason as string) || undefined,
    notes: (req.body.notes as string) || undefined,
  });

  res.status(201).json({
    success: true,
    message: "Appointment scheduled successfully",
    data: appointment,
  });
});

export const rescheduleAppointment = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { startTime, endTime } = req.body as { startTime: string | Date; endTime: string | Date };

  const appointment = await appointmentService.rescheduleAppointment(id, startTime, endTime);

  res.status(200).json({
    success: true,
    message: "Appointment rescheduled successfully",
    data: appointment,
  });
});

export const cancelAppointment = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const reason = req.body.reason as string | undefined;

  const appointment = await appointmentService.cancelAppointment(id, reason);

  res.status(200).json({
    success: true,
    message: "Appointment cancelled successfully",
    data: appointment,
  });
});

export const getDoctorSchedule = asyncHandler(async (req: Request, res: Response) => {
  const doctorId = req.params.doctorId as string;
  const date = req.query.date as string;

  const schedule = await appointmentService.getDoctorSchedule(doctorId, date);

  res.status(200).json({
    success: true,
    message: "Doctor schedule retrieved successfully",
    data: schedule,
  });
});
