import { z } from "zod";
import { Role, Gender } from "@prisma/client";

export const createUserSchema = z.object({
  body: z.object({
    email: z.string({
      message: "Email is required",
    }).email("Invalid email format"),
    password: z.string({
      message: "Password is required",
    }).min(6, "Password must be at least 6 characters"),
    firstName: z.string({
      message: "First name is required",
    }).min(1, "First name must not be empty"),
    lastName: z.string({
      message: "Last name is required",
    }).min(1, "Last name must not be empty"),
    role: z.nativeEnum(Role, {
      message: "Invalid role assigned",
    }),
    gender: z.nativeEnum(Gender).optional().nullable(),
    phone: z.string().optional().nullable(),
    branchId: z.string().optional().nullable(),
    departmentId: z.string().optional().nullable(),
  }),
});

export const updateUserSchema = z.object({
  body: z.object({
    firstName: z.string().min(1, "First name must not be empty").optional(),
    lastName: z.string().min(1, "Last name must not be empty").optional(),
    role: z.nativeEnum(Role).optional(),
    gender: z.nativeEnum(Gender).optional().nullable(),
    phone: z.string().optional().nullable(),
    branchId: z.string().optional().nullable(),
    departmentId: z.string().optional().nullable(),
    isActive: z.boolean().optional(),
  }),
  params: z.object({
    id: z.string({
      message: "User ID param is required",
    }),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    password: z.string({
      message: "New password is required",
    }).min(6, "New password must be at least 6 characters"),
  }),
  params: z.object({
    id: z.string({
      message: "User ID param is required",
    }),
  }),
});
