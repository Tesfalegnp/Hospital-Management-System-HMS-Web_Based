import { z } from "zod";

export const createPermissionSchema = z.object({
  body: z.object({
    module: z.string().min(2, "Module must be at least 2 characters").toLowerCase().trim(),
    resource: z.string().min(2, "Resource must be at least 2 characters").toLowerCase().trim(),
    action: z.string().min(2, "Action must be at least 2 characters").toLowerCase().trim(),
    name: z.string().min(3, "Name must be at least 3 characters").trim(),
    description: z.string().optional(),
    category: z.string().min(2, "Category must be specified").trim(),
  }),
});

export const updatePermissionSchema = z.object({
  body: z.object({
    name: z.string().min(3, "Name must be at least 3 characters").trim().optional(),
    description: z.string().optional(),
    category: z.string().min(2, "Category must be specified").trim().optional(),
  }),
});

export const togglePermissionStatusSchema = z.object({
  body: z.object({
    isActive: z.boolean(),
  }),
});
