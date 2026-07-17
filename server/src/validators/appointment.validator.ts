import { z } from "zod";
import { AppointmentStatus } from "@prisma/client";

export const createAppointmentSchema = z.object({
  body: z.object({
    patientId: z.string({
      message: "Patient ID is required",
    }).cuid("Patient ID must be a valid CUID"),
    
    doctorId: z.string({
      message: "Doctor ID is required",
    }).cuid("Doctor ID must be a valid CUID"),
    
    branchId: z.string({
      message: "Branch ID is required",
    }).cuid("Branch ID must be a valid CUID"),
    
    departmentId: z.string().cuid("Department ID must be a valid CUID").optional().nullable(),
    
    appointmentDate: z.coerce.date({
      message: "Appointment date is required",
    }),
    
    startTime: z.coerce.date({
      message: "Start time is required",
    }),
    
    endTime: z.coerce.date({
      message: "End time is required",
    }),
    
    reason: z.string().max(500, "Reason must not exceed 500 characters").optional().nullable(),
    notes: z.string().max(1000, "Notes must not exceed 1000 characters").optional().nullable(),
  }),
});

export const rescheduleAppointmentSchema = z.object({
  body: z.object({
    startTime: z.coerce.date({
      message: "New start time is required",
    }),
    
    endTime: z.coerce.date({
      message: "New end time is required",
    }),
  }),
});

export const cancelAppointmentSchema = z.object({
  body: z.object({
    reason: z.string().max(500, "Cancellation reason must not exceed 500 characters").optional(),
  }),
});

export const queryAppointmentSchema = z.object({
  query: z.object({
    branchId: z.string().cuid("Branch ID must be a valid CUID").optional(),
    doctorId: z.string().cuid("Doctor ID must be a valid CUID").optional(),
    patientId: z.string().cuid("Patient ID must be a valid CUID").optional(),
    status: z.nativeEnum(AppointmentStatus).optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(10).optional(),
    cursor: z.string().optional(),
  }),
});

export const getDoctorScheduleSchema = z.object({
  params: z.object({
    doctorId: z.string().cuid("Doctor ID must be a valid CUID"),
  }),
  query: z.object({
    date: z.coerce.date({
      message: "Date is required",
    }),
  }),
});
