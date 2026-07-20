import { z } from "zod";
import { Role } from "@prisma/client";

export const loginSchema = z.object({
  body: z.object({
    email: z.string({
      message: "Email is required",
    }).email("Invalid email address format"),
    
    password: z.string({
      message: "Password is required",
    }).min(6, "Password must be at least 6 characters"),
  }),
});

export const registerSchema = z.object({
  body: z.object({
    email: z.string({
      message: "Email is required",
    }).email("Invalid email address format"),
    
    password: z.string({
      message: "Password is required",
    }).min(6, "Password must be at least 6 characters"),
    
    firstName: z.string({
      message: "First name is required",
    }).min(1, "First name must not be empty").max(50),
    
    lastName: z.string({
      message: "Last name is required",
    }).min(1, "Last name must not be empty").max(50),
    
    role: z.nativeEnum(Role, {
      message: "Invalid role assigned",
    }),
  }),
});
