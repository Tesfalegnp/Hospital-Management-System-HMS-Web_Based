import { z } from "zod";

export const createWardSchema = z.object({
  body: z.object({
    branchId: z.string({
      message: "Branch ID is required",
    }).cuid("Branch ID must be a valid CUID"),
    
    name: z.string({
      message: "Ward name is required",
    }).min(2, "Ward name must be at least 2 characters").max(100),
    
    code: z.string({
      message: "Ward code is required",
    }).min(2, "Ward code must be at least 2 characters").max(50),
    
    dailyTariffCode: z.string({
      message: "Daily tariff code is required",
    }).min(2, "Daily tariff code must be at least 2 characters").max(50),
  }),
});

export const createBedSchema = z.object({
  body: z.object({
    wardId: z.string({
      message: "Ward ID is required",
    }).cuid("Ward ID must be a valid CUID"),
    
    bedNumber: z.string({
      message: "Bed number is required",
    }).min(1, "Bed number is required").max(50),
  }),
});

export const admitPatientSchema = z.object({
  body: z.object({
    patientId: z.string({
      message: "Patient ID is required",
    }).cuid("Patient ID must be a valid CUID"),
    
    admittingDoctorId: z.string({
      message: "Admitting doctor ID is required",
    }).cuid("Admitting doctor ID must be a valid CUID"),
    
    bedId: z.string({
      message: "Bed ID is required",
    }).cuid("Bed ID must be a valid CUID"),
  }),
});

export const logVitalsSchema = z.object({
  body: z.object({
    temperature: z.number().positive().max(50).optional().nullable(),
    bloodPressure: z.string().max(20).optional().nullable(),
    heartRate: z.number().int().positive().max(300).optional().nullable(),
    respiratoryRate: z.number().int().positive().max(150).optional().nullable(),
    oxygenSaturation: z.number().int().min(0).max(100).optional().nullable(),
    notes: z.string().max(500).optional().nullable(),
  }),
});

export const transferBedSchema = z.object({
  body: z.object({
    targetBedId: z.string({
      message: "Target Bed ID is required",
    }).cuid("Target Bed ID must be a valid CUID"),
  }),
});

export const dischargePatientSchema = z.object({
  body: z.object({
    dischargeNotes: z.string().max(1000).optional().nullable(),
  }),
});
