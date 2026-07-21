import { z } from "zod";

export const createRoleSchema = z.object({
  body: z.object({
    name: z.string().min(2, "Role name must be at least 2 characters").trim(),
    code: z
      .string()
      .min(2, "Role code must be at least 2 characters")
      .toUpperCase()
      .trim()
      .regex(/^[A-Z0-9_]+$/, "Role code must contain only uppercase letters, numbers, and underscores"),
    description: z.string().optional(),
    level: z.number().int().min(0, "Level must be a non-negative integer").optional().default(0),
    parentId: z.string().cuid("Invalid parent role ID").optional().nullable(),
    isActive: z.boolean().optional().default(true),
  }),
});

export const updateRoleSchema = z.object({
  body: z.object({
    name: z.string().min(2, "Role name must be at least 2 characters").trim().optional(),
    description: z.string().optional().nullable(),
    level: z.number().int().min(0, "Level must be a non-negative integer").optional(),
    parentId: z.string().cuid("Invalid parent role ID").optional().nullable(),
  }),
});

export const toggleRoleStatusSchema = z.object({
  body: z.object({
    isActive: z.boolean(),
  }),
});

export const assignPermissionSchema = z.object({
  body: z.object({
    permissionId: z.string().min(1, "Permission ID is required"),
  }),
});
