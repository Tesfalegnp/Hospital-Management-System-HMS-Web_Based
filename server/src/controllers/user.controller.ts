import { Request, Response } from "express";
import { userService } from "../services/user.service.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

// Sanitizer utility to remove passwords and internal session fields from returned payloads
const sanitizeUser = (user: any) => {
  if (!user) return null;
  const { password, refreshToken, ...rest } = user;
  return rest;
};

export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const role = req.query.role as any;
  const branchId = req.query.branchId as string;
  const departmentId = req.query.departmentId as string;
  const search = req.query.search as string;
  const page = req.query.page ? parseInt(req.query.page as string) : undefined;
  const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;

  const result = await userService.getUsers({
    role,
    branchId,
    departmentId,
    search,
    page,
    limit,
  });

  res.status(200).json({
    success: true,
    data: result.data.map(sanitizeUser),
    meta: result.meta,
  });
});

export const createUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.createUser({
    email: req.body.email,
    password: req.body.password,
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    role: req.body.role,
    gender: req.body.gender,
    phone: req.body.phone,
    branchId: req.body.branchId,
    departmentId: req.body.departmentId,
  });

  res.status(201).json({
    success: true,
    message: "User account created successfully",
    data: sanitizeUser(user),
  });
});

export const editUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.updateUser(req.params.id as string, {
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    role: req.body.role,
    gender: req.body.gender,
    phone: req.body.phone,
    branchId: req.body.branchId,
    departmentId: req.body.departmentId,
    isActive: req.body.isActive,
  });

  res.status(200).json({
    success: true,
    message: "User account updated successfully",
    data: sanitizeUser(user),
  });
});

export const resetUserPassword = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.resetPassword(req.params.id as string, req.body.password);

  res.status(200).json({
    success: true,
    message: "User password reset successfully",
    data: sanitizeUser(user),
  });
});

export const getBranchesLookup = asyncHandler(async (req: Request, res: Response) => {
  const branches = await userService.getBranchesLookup();
  res.status(200).json({
    success: true,
    data: branches,
  });
});

export const getDepartmentsLookup = asyncHandler(async (req: Request, res: Response) => {
  const departments = await userService.getDepartmentsLookup();
  res.status(200).json({
    success: true,
    data: departments,
  });
});
