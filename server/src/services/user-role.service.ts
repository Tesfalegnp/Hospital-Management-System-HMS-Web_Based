import { userRoleRepository } from "../repositories/user-role.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import roleRepository from "../repositories/role.repository.js";
import prisma from "../database/prisma.js";
import permissionService from "./permission.service.js";
import { AppError } from "../utils/AppError.js";

export interface AssignRoleInput {
  roleId: string;
  hospitalId?: string | null;
  branchId?: string | null;
}

export class UserRoleService {
  /**
   * List all role assignments for a user.
   */
  async getUserRoles(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError("User account not found", 404);
    }
    return userRoleRepository.findManyByUser(userId);
  }

  /**
   * Assign an enterprise role definition to a user.
   */
  async assignRoleToUser(userId: string, input: AssignRoleInput) {
    const user = await userRepository.findById(userId);
    if (!user || !user.isActive) {
      throw new AppError("User account not found or is deactivated", 404);
    }

    const role = await roleRepository.findById(input.roleId);
    if (!role || !role.isActive) {
      throw new AppError("Role definition not found or is disabled", 404);
    }

    // 1. Tenant Scoping Validations
    if (input.hospitalId) {
      const hospital = await prisma.hospital.findFirst({
        where: { id: input.hospitalId, deletedAt: null },
      });
      if (!hospital) {
        throw new AppError("Scoping Hospital record not found", 404);
      }
    }

    if (input.branchId) {
      const branch = await prisma.branch.findFirst({
        where: { id: input.branchId, deletedAt: null },
      });
      if (!branch) {
        throw new AppError("Scoping Branch record not found", 404);
      }

      // Check branch-hospital association integrity
      if (input.hospitalId && branch.hospitalId !== input.hospitalId) {
        throw new AppError("Scoping Branch does not belong to the selected scoping Hospital", 400);
      }
    }

    // 2. Prevent duplicate active user-role assignments
    const existing = await userRoleRepository.findAssignment(userId, input.roleId, input.hospitalId, input.branchId);
    if (existing && !existing.deletedAt) {
      throw new AppError("This role assignment already exists for the user under the selected scope", 409);
    }

    return userRoleRepository.assignRole({
      userId,
      roleId: input.roleId,
      hospitalId: input.hospitalId || null,
      branchId: input.branchId || null,
    });
  }

  /**
   * Revoke a role assignment from a user.
   */
  async revokeRoleFromUser(userId: string, userRoleId: string) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError("User account not found", 404);
    }

    const assignment = await userRoleRepository.findById(userRoleId);
    if (!assignment || assignment.userId !== userId) {
      throw new AppError("Role assignment record not found", 404);
    }

    // 1. Prevent lockout of the last active Super Administrator
    if (assignment.role.code === "SUPER_ADMIN_ROLE") {
      const superAdminCount = await userRoleRepository.countActiveSuperAdmins();
      if (superAdminCount <= 1) {
        throw new AppError("Security Lockout Protection: Cannot revoke SUPER_ADMIN_ROLE from the last active Super Administrator account", 403);
      }
    }

    return userRoleRepository.revokeRole(userRoleId);
  }

  /**
   * Dynamic effective permissions preview for a user.
   * Calls PermissionService as the absolute source of truth.
   */
  async getUserEffectivePermissions(userId: string, hospitalId?: string | null, branchId?: string | null) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError("User account not found", 404);
    }

    const result = await permissionService.getEffectivePermissionsResult(userId, {
      hospitalId: hospitalId || null,
      branchId: branchId || null,
    });

    return {
      userId: result.userId,
      scope: result.scope,
      roles: result.roles,
      grantedPermissions: Array.from(result.grantedPermissions),
      deniedPermissions: Array.from(result.deniedPermissions),
      evaluatedAt: result.evaluatedAt,
    };
  }
}

export const userRoleService = new UserRoleService();
export default userRoleService;
