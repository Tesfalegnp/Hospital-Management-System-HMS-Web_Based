import { z } from "zod";

export const stockIntakeSchema = z.object({
  body: z.object({
    medicineId: z.string({
      message: "Medicine ID is required",
    }).cuid("Medicine ID must be a valid CUID"),
    
    batchNumber: z.string({
      message: "Batch number is required",
    }).min(1, "Batch number must not be empty").max(50),
    
    expiryDate: z.string({
      message: "Expiry date is required",
    }).datetime("Expiry date must be a valid ISO datetime"),
    
    quantity: z.number({
      message: "Quantity is required",
    }).int().positive("Intake quantity must be a positive integer"),
    
    purchasePrice: z.number({
      message: "Purchase price is required",
    }).positive("Purchase price must be positive"),
    
    sellingPrice: z.number({
      message: "Selling price is required",
    }).positive("Selling price must be positive"),
    
    storageLocationId: z.string().cuid().optional().nullable(),
    
    branchId: z.string({
      message: "Branch ID is required",
    }).cuid("Branch ID must be a valid CUID"),
  }),
});

export const stockAdjustmentSchema = z.object({
  body: z.object({
    medicineBatchId: z.string({
      message: "Medicine batch ID is required",
    }).cuid("Batch ID must be a valid CUID"),
    
    quantity: z.number({
      message: "Adjustment quantity is required",
    }).int().refine(val => val !== 0, {
      message: "Adjustment quantity cannot be zero",
    }),
    
    notes: z.string({
      message: "Reason notes are required for inventory adjustment auditing",
    }).min(5, "Adjustment notes must explain clinical/admin context (min 5 chars)").max(500),
  }),
});

export const stockTransferSchema = z.object({
  body: z.object({
    medicineBatchId: z.string({
      message: "Medicine batch ID is required",
    }).cuid("Batch ID must be a valid CUID"),
    
    destinationBranchId: z.string({
      message: "Destination branch ID is required",
    }).cuid("Destination branch must be a valid CUID"),
    
    destinationStorageLocationId: z.string().cuid().optional().nullable(),
    
    quantity: z.number({
      message: "Transfer quantity is required",
    }).int().positive("Transfer quantity must be a positive integer"),
  }),
});
