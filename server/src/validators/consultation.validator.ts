import { z } from "zod";

export const recordConsultationSchema = z.object({
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
    
    appointmentId: z.string().cuid("Appointment ID must be a valid CUID").optional().nullable(),
    
    bloodPressure: z.string().max(50, "Blood pressure format is too long").optional().nullable(),
    heartRate: z.coerce.number().int().positive("Heart rate must be positive").max(300).optional().nullable(),
    temperature: z.coerce.number().positive("Temperature must be positive").max(50).optional().nullable(),
    respiratoryRate: z.coerce.number().int().positive("Respiratory rate must be positive").max(150).optional().nullable(),
    weight: z.coerce.number().positive("Weight must be positive").max(1000).optional().nullable(),
    
    chiefComplaint: z.string().max(2000, "Chief complaint must not exceed 2000 characters").optional().nullable(),
    physicalExamination: z.string().max(5000, "Physical examination must not exceed 5000 characters").optional().nullable(),
    diagnosis: z.string().max(5000, "Diagnosis must not exceed 5000 characters").optional().nullable(),
    treatmentPlan: z.string().max(5000, "Treatment plan must not exceed 5000 characters").optional().nullable(),
  }),
});

export const updateConsultationSchema = z.object({
  params: z.object({
    id: z.string().cuid("Consultation ID must be a valid CUID"),
  }),
  body: z.object({
    bloodPressure: z.string().max(50, "Blood pressure format is too long").optional().nullable(),
    heartRate: z.coerce.number().int().positive("Heart rate must be positive").max(300).optional().nullable(),
    temperature: z.coerce.number().positive("Temperature must be positive").max(50).optional().nullable(),
    respiratoryRate: z.coerce.number().int().positive("Respiratory rate must be positive").max(150).optional().nullable(),
    weight: z.coerce.number().positive("Weight must be positive").max(1000).optional().nullable(),
    
    chiefComplaint: z.string().max(2000, "Chief complaint must not exceed 2000 characters").optional().nullable(),
    physicalExamination: z.string().max(5000, "Physical examination must not exceed 5000 characters").optional().nullable(),
    diagnosis: z.string().max(5000, "Diagnosis must not exceed 5000 characters").optional().nullable(),
    treatmentPlan: z.string().max(5000, "Treatment plan must not exceed 5000 characters").optional().nullable(),
  }),
});

export const queryHistorySchema = z.object({
  params: z.object({
    patientId: z.string().cuid("Patient ID must be a valid CUID"),
  }),
  query: z.object({
    limit: z.coerce.number().int().min(1).max(100).default(10).optional(),
    cursor: z.string().optional(),
  }),
});
