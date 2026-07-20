import { z } from "zod";
import { TariffCategory, InvoiceStatus, PaymentMethod } from "@prisma/client";

export const createTariffSchema = z.object({
  body: z.object({
    branchId: z.string({
      message: "Branch ID is required",
    }).cuid("Branch ID must be a valid CUID"),
    
    category: z.nativeEnum(TariffCategory),
    
    name: z.string({
      message: "Tariff name is required",
    }).min(2, "Tariff name must be at least 2 characters").max(100),
    
    code: z.string({
      message: "Tariff code is required",
    }).min(2, "Tariff code must be at least 2 characters").max(50),
    
    price: z.number({
      message: "Price is required",
    }).positive("Price must be a positive decimal fee"),
  }),
});

export const createInvoiceSchema = z.object({
  body: z.object({
    patientId: z.string({
      message: "Patient ID is required",
    }).cuid("Patient ID must be a valid CUID"),
    
    branchId: z.string({
      message: "Branch ID is required",
    }).cuid("Branch ID must be a valid CUID"),
    
    notes: z.string().max(500).optional().nullable(),
    
    items: z.array(
      z.object({
        name: z.string({
          message: "Item name is required",
        }).min(2, "Item name is too short").max(100),
        
        quantity: z.number({
          message: "Quantity is required",
        }).int().positive("Item quantity must be a positive integer"),
        
        unitPrice: z.number({
          message: "Unit price is required",
        }).positive("Unit price must be a positive value"),
        
        consultationId: z.string().cuid().optional().nullable(),
        
        labOrderId: z.string().optional().nullable(), // LabOrder uses uuid in this database structure, so no .cuid() constraint
        
        dispenseRecordId: z.string().cuid().optional().nullable(),
      })
    ).min(1, "Invoice must contain at least one charge item"),
  }),
});

export const recordPaymentSchema = z.object({
  body: z.object({
    invoiceId: z.string({
      message: "Invoice ID is required",
    }).cuid("Invoice ID must be a valid CUID"),
    
    amount: z.number({
      message: "Payment amount is required",
    }).positive("Payment amount must be a positive decimal"),
    
    method: z.nativeEnum(PaymentMethod),
    
    referenceNumber: z.string().max(100).optional().nullable(),
    
    notes: z.string().max(500).optional().nullable(),
  }),
});
