import { Request, Response } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { permissionManagementService } from "../services/permission-management.service.js";

export const listPermissions = asyncHandler(async (req: Request, res: Response) => {
  const { search, module, category, isActive, page, limit, sortBy, sortOrder } = req.query;

  const result = await permissionManagementService.getPermissions({
    search: typeof search === "string" ? search : undefined,
    module: typeof module === "string" ? module : undefined,
    category: typeof category === "string" ? category : undefined,
    isActive: isActive !== undefined ? isActive === "true" : undefined,
    page: page ? parseInt(String(page), 10) : 1,
    limit: limit ? parseInt(String(limit), 10) : 10,
    sortBy: typeof sortBy === "string" ? sortBy : "createdAt",
    sortOrder: sortOrder === "asc" ? "asc" : "desc",
  });

  res.status(200).json({
    success: true,
    message: "Permissions retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

export const getPermissionDetail = asyncHandler(async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const permission = await permissionManagementService.getPermissionById(id);

  res.status(200).json({
    success: true,
    message: "Permission retrieved successfully",
    data: permission,
  });
});

export const createPermission = asyncHandler(async (req: Request, res: Response) => {
  const { module, resource, action, name, description, category } = req.body;

  const permission = await permissionManagementService.createPermission({
    module,
    resource,
    action,
    name,
    description,
    category,
  });

  res.status(201).json({
    success: true,
    message: "Permission created successfully",
    data: permission,
  });
});

export const updatePermission = asyncHandler(async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const { name, description, category } = req.body;

  const permission = await permissionManagementService.updatePermission(id, {
    name,
    description,
    category,
  });

  res.status(200).json({
    success: true,
    message: "Permission updated successfully",
    data: permission,
  });
});

export const togglePermissionStatus = asyncHandler(async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const { isActive } = req.body;

  const permission = await permissionManagementService.togglePermissionStatus(id, isActive);

  res.status(200).json({
    success: true,
    message: `Permission ${isActive ? "enabled" : "disabled"} successfully`,
    data: permission,
  });
});
