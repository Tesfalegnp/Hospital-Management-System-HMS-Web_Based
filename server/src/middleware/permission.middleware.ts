import { Request, Response, NextFunction } from "express";
import { permissionService, PermissionScope } from "../services/permission.service.js";
import { AppError } from "../utils/AppError.js";

export type ScopeResolver = (req: Request) => PermissionScope;

/**
 * Default scope extraction strategy.
 * Resolves hospitalId and branchId from headers (x-hospital-id, x-branch-id),
 * route params, query string, or authenticated user token claims.
 */
export const defaultScopeResolver: ScopeResolver = (req: Request): PermissionScope => {
  const hospitalHeader = req.headers["x-hospital-id"];
  const branchHeader = req.headers["x-branch-id"];

  const hospitalStr = Array.isArray(hospitalHeader) ? hospitalHeader[0] : hospitalHeader;
  const branchStr = Array.isArray(branchHeader) ? branchHeader[0] : branchHeader;

  const paramHospitalId = typeof req.params.hospitalId === "string" ? req.params.hospitalId : undefined;
  const paramBranchId = typeof req.params.branchId === "string" ? req.params.branchId : undefined;

  const hospitalId =
    hospitalStr ||
    paramHospitalId ||
    (typeof req.query.hospitalId === "string" ? req.query.hospitalId : undefined) ||
    req.user?.hospitalId;

  const branchId =
    branchStr ||
    paramBranchId ||
    (typeof req.query.branchId === "string" ? req.query.branchId : undefined) ||
    req.user?.branchId;

  return {
    hospitalId: hospitalId ? String(hospitalId) : null,
    branchId: branchId ? String(branchId) : null,
  };
};

/**
 * Curried route-guard middleware enforcing a single atomic permission code.
 */
export const requirePermission = (
  permissionCode: string,
  scopeResolver: ScopeResolver = defaultScopeResolver
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !req.user.id) {
      return next(new AppError("Authentication required", 401));
    }

    try {
      const scope = scopeResolver(req);
      const isGranted = await permissionService.hasPermission(req.user.id, permissionCode, scope);

      if (!isGranted) {
        return next(new AppError("Forbidden - Insufficient permissions", 403));
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Curried route-guard middleware enforcing ANY of the provided permission codes.
 */
export const requireAnyPermission = (
  permissionCodes: string[],
  scopeResolver: ScopeResolver = defaultScopeResolver
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !req.user.id) {
      return next(new AppError("Authentication required", 401));
    }

    try {
      const scope = scopeResolver(req);
      const isGranted = await permissionService.hasAnyPermission(req.user.id, permissionCodes, scope);

      if (!isGranted) {
        return next(new AppError("Forbidden - Insufficient permissions", 403));
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Curried route-guard middleware enforcing ALL of the provided permission codes.
 */
export const requireAllPermissions = (
  permissionCodes: string[],
  scopeResolver: ScopeResolver = defaultScopeResolver
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !req.user.id) {
      return next(new AppError("Authentication required", 401));
    }

    try {
      const scope = scopeResolver(req);
      const isGranted = await permissionService.hasAllPermissions(req.user.id, permissionCodes, scope);

      if (!isGranted) {
        return next(new AppError("Forbidden - Insufficient permissions", 403));
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
