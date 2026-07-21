import { Request, Response } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { roleManagementService } from "../services/role-management.service.js";

export const listRoles = asyncHandler(async (req: Request, res: Response) => {
  const { search, isActive, isSystem, page, limit, sortBy, sortOrder } = req.query;

  const result = await roleManagementService.getRoles({
    search: typeof search === "string" ? search : undefined,
    isActive: isActive !== undefined ? isActive === "true" : undefined,
    isSystem: isSystem !== undefined ? isSystem === "true" : undefined,
    page: page ? parseInt(String(page), 10) : 1,
    limit: limit ? parseInt(String(limit), 10) : 10,
    sortBy: typeof sortBy === "string" ? sortBy : "createdAt",
    sortOrder: sortOrder === "asc" ? "asc" : "desc",
  });

  res.status(200).json({
    success: true,
    message: "Roles retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

export const getRoleDetail = asyncHandler(async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const role = await roleManagementService.getRoleById(id);

  res.status(200).json({
    success: true,
    message: "Role detail retrieved successfully",
    data: role,
  });
});

export const createRole = asyncHandler(async (req: Request, res: Response) => {
  const { name, code, description, level, parentId, isActive } = req.body;

  const role = await roleManagementService.createRole({
    name,
    code,
    description,
    level,
    parentId,
    isActive,
  });

  res.status(201).json({
    success: true,
    message: "Role definition created successfully",
    data: role,
  });
});

export const updateRole = asyncHandler(async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const { name, description, level, parentId } = req.body;

  const role = await roleManagementService.updateRole(id, {
    name,
    description,
    level,
    parentId,
  });

  res.status(200).json({
    success: true,
    message: "Role updated successfully",
    data: role,
  });
});

export const toggleRoleStatus = asyncHandler(async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const { isActive } = req.body;

  const role = await roleManagementService.toggleRoleStatus(id, isActive);

  res.status(200).json({
    success: true,
    message: `Role ${isActive ? "enabled" : "disabled"} successfully`,
    data: role,
  });
});

export const deleteRole = asyncHandler(async (req: Request, res: Response) => {
  const id = String(req.params.id);

  await roleManagementService.deleteRole(id);

  res.status(200).json({
    success: true,
    message: "Role deleted successfully",
  });
});

export const getRolePermissions = asyncHandler(async (req: Request, res: Response) => {
  const roleId = String(req.params.id);

  const rolePermissions = await roleManagementService.getRolePermissions(roleId);

  res.status(200).json({
    success: true,
    message: "Role permissions retrieved successfully",
    data: rolePermissions,
  });
});

export const assignPermissionToRole = asyncHandler(async (req: Request, res: Response) => {
  const roleId = String(req.params.id);
  const { permissionId } = req.body;

  const result = await roleManagementService.assignPermissionToRole(roleId, permissionId);

  res.status(201).json({
    success: true,
    message: "Permission assigned to role successfully",
    data: result,
  });
});

export const removePermissionFromRole = asyncHandler(async (req: Request, res: Response) => {
  const roleId = String(req.params.id);
  const permissionId = String(req.params.permissionId);

  await roleManagementService.removePermissionFromRole(roleId, permissionId);

  res.status(200).json({
    success: true,
    message: "Permission revoked from role successfully",
  });
});
