import { z } from "zod";

export const createPrescriptionSchema = z.object({
  body: z.object({
    patientId: z.string({
      message: "Patient ID is required",
    }).cuid("Patient ID must be a valid CUID"),
    
    doctorId: z.string({
      message: "Doctor ID is required",
    }).cuid("Doctor ID must be a valid CUID"),
    
    encounterId: z.string().cuid("Encounter ID must be a valid CUID").optional().nullable(),
    
    notes: z.string().max(500).optional().nullable(),
    
    items: z.array(
      z.object({
        medicineId: z.string({
          message: "Medicine ID is required",
        }).cuid("Medicine ID must be a valid CUID"),
        
        quantity: z.number({
          message: "Quantity is required",
        }).int().positive("Prescribed quantity must be a positive integer"),
        
        dosageInstruction: z.string({
          message: "Dosage instruction is required",
        }).min(3, "Dosage instruction is too short").max(250),
        
        routeId: z.string({
          message: "Administration route ID is required",
        }).cuid("Route ID must be a valid CUID"),
      })
    ).min(1, "Prescription must contain at least one medication item"),
  }),
});

export const dispensePrescriptionSchema = z.object({
  body: z.object({
    items: z.array(
      z.object({
        prescriptionItemId: z.string({
          message: "Prescription item ID is required",
        }).cuid("Prescription item ID must be a valid CUID"),
        
        medicineBatchId: z.string({
          message: "Medicine batch ID is required",
        }).cuid("Batch ID must be a valid CUID"),
        
        quantityDispensed: z.number({
          message: "Quantity dispensed is required",
        }).int().positive("Dispensed quantity must be a positive integer"),
      })
    ).min(1, "Dispense transaction must contain at least one item"),
    
    witnessId: z.string().cuid("Witness ID must be a valid CUID").optional().nullable(),
    
    notes: z.string().max(500).optional().nullable(),
  }),
});
