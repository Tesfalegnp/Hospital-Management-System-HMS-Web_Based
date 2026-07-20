import { z } from "zod";

export const createMedicineSchema = z.object({
  body: z.object({
    brandName: z.string({
      message: "Brand name is required",
    }).min(1, "Brand name must not be empty").max(100),
    
    genericName: z.string({
      message: "Generic name is required",
    }).min(1, "Generic name must not be empty").max(100),
    
    sku: z.string().max(100).optional().nullable(),
    
    strength: z.string({
      message: "Strength (e.g. 500mg, 10ml) is required",
    }).min(1, "Strength must not be empty").max(50),
    
    description: z.string().max(1000).optional().nullable(),
    
    manufacturerId: z.string({
      message: "Manufacturer ID is required",
    }).cuid("Manufacturer ID must be a valid CUID"),
    
    categoryId: z.string({
      message: "Medicine category ID is required",
    }).cuid("Category ID must be a valid CUID"),
    
    dosageFormId: z.string({
      message: "Dosage form ID is required",
    }).cuid("Dosage form ID must be a valid CUID"),
    
    storageLocationId: z.string().cuid("Storage location ID must be a valid CUID").optional().nullable(),
    
    approvedRouteIds: z.array(z.string().cuid("Route ID must be a valid CUID"), {
      message: "Approved administration routes are required",
    }).min(1, "At least one administration route must be approved"),

    interactions: z.array(
      z.object({
        medicineBId: z.string().cuid("Interacting medicine ID must be a valid CUID"),
        severity: z.enum(["CRITICAL", "WARNING", "INFORMATIONAL"]),
        description: z.string().min(1, "Interaction description must not be empty").max(1000),
      })
    ).optional(),
  }),
});

export const updateMedicineSchema = z.object({
  body: z.object({
    brandName: z.string().min(1).max(100).optional(),
    genericName: z.string().min(1).max(100).optional(),
    sku: z.string().max(100).optional().nullable(),
    strength: z.string().min(1).max(50).optional(),
    description: z.string().max(1000).optional().nullable(),
    manufacturerId: z.string().cuid().optional(),
    categoryId: z.string().cuid().optional(),
    dosageFormId: z.string().cuid().optional(),
    storageLocationId: z.string().cuid().optional().nullable(),
    approvedRouteIds: z.array(z.string().cuid()).min(1).optional(),
    interactions: z.array(
      z.object({
        medicineBId: z.string().cuid(),
        severity: z.enum(["CRITICAL", "WARNING", "INFORMATIONAL"]),
        description: z.string().min(1).max(1000),
      })
    ).optional(),
  }),
});

export const checkInteractionsSchema = z.object({
  body: z.object({
    medicineIds: z.array(z.string().cuid("Medicine ID must be a valid CUID"), {
      message: "An array of medicine IDs is required",
    }).min(1, "At least one medicine ID must be provided to check"),
  }),
});

export const createPatientAllergySchema = z.object({
  body: z.object({
    medicineId: z.string({
      message: "Medicine ID is required",
    }).cuid("Medicine ID must be a valid CUID"),
    
    severity: z.enum(["MILD", "MODERATE", "SEVERE"], {
      message: "Severity must be MILD, MODERATE, or SEVERE",
    }),
    
    reaction: z.string().max(500).optional().nullable(),
  }),
});
