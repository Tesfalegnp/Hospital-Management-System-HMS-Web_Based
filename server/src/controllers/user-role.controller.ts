import { Request, Response } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { userRoleService } from "../services/user-role.service.js";

export const getUserRoles = asyncHandler(async (req: Request, res: Response) => {
  const userId = String(req.params.id);
  const userRoles = await userRoleService.getUserRoles(userId);

  res.status(200).json({
    success: true,
    message: "User role assignments retrieved successfully",
    data: userRoles,
  });
});

export const assignUserRole = asyncHandler(async (req: Request, res: Response) => {
  const userId = String(req.params.id);
  const { roleId, hospitalId, branchId } = req.body;

  const userRole = await userRoleService.assignRoleToUser(userId, {
    roleId,
    hospitalId,
    branchId,
  });

  res.status(201).json({
    success: true,
    message: "Enterprise role assigned to user successfully",
    data: userRole,
  });
});

export const revokeUserRole = asyncHandler(async (req: Request, res: Response) => {
  const userId = String(req.params.id);
  const userRoleId = String(req.params.userRoleId);

  await userRoleService.revokeRoleFromUser(userId, userRoleId);

  res.status(200).json({
    success: true,
    message: "Role assignment revoked successfully",
  });
});

export const getUserEffectivePermissions = asyncHandler(async (req: Request, res: Response) => {
  const userId = String(req.params.id);
  const { hospitalId, branchId } = req.query;

  const result = await userRoleService.getUserEffectivePermissions(
    userId,
    typeof hospitalId === "string" ? hospitalId : undefined,
    typeof branchId === "string" ? branchId : undefined
  );

  res.status(200).json({
    success: true,
    message: "Computed effective permissions retrieved successfully",
    data: result,
  });
});
