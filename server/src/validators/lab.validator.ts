import { z } from "zod";

export const createLabTestCatalogSchema = z.object({
  body: z.object({
    branchId: z.string({
      message: "Branch ID is required",
    }).cuid("Branch ID must be a valid CUID"),
    
    name: z.string({
      message: "Test name is required",
    }).min(2, "Test name must be at least 2 characters").max(100),
    
    code: z.string({
      message: "Test code is required",
    }).min(2, "Test code must be at least 2 characters").max(50),
    
    category: z.string({
      message: "Category is required",
    }).min(2, "Category must be at least 2 characters").max(100),
    
    price: z.number({
      message: "Price is required",
    }).positive("Price must be a positive decimal fee"),
    
    normalRangeMin: z.number().optional().nullable(),
    normalRangeMax: z.number().optional().nullable(),
    unit: z.string().max(20).optional().nullable(),
  }),
});

export const createLabOrderSchema = z.object({
  body: z.object({
    encounterId: z.string({
      message: "Encounter ID is required",
    }).cuid("Encounter ID must be a valid CUID"),
    
    patientId: z.string({
      message: "Patient ID is required",
    }).cuid("Patient ID must be a valid CUID"),
    
    labTestCatalogId: z.string().cuid().optional().nullable(),
    
    testName: z.string({
      message: "Test name is required",
    }).min(1, "Test name must not be empty").max(200),
    
    clinicalNotes: z.string().max(1000).optional().nullable(),
  }),
});

export const enterLabResultsSchema = z.object({
  body: z.object({
    findings: z.string({
      message: "Findings description is required",
    }).min(1, "Findings must not be empty").max(5000),
    
    value: z.number().optional().nullable(),
    quantitativeData: z.record(z.string(), z.any()).optional().nullable(),
  }),
});
