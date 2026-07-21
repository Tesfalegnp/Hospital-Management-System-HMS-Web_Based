import { roleRepository, RoleFilterParams } from "../repositories/role.repository.js";
import permissionRepository from "../repositories/permission.repository.js";
import { AppError } from "../utils/AppError.js";

export interface CreateRoleInput {
  name: string;
  code: string;
  description?: string;
  level?: number;
  parentId?: string | null;
  isActive?: boolean;
}

export interface UpdateRoleInput {
  name?: string;
  description?: string | null;
  level?: number;
  parentId?: string | null;
}

export class RoleManagementService {
  /**
   * Helper to check circular parent inheritance loop.
   * Traverses parentId chain of targetParentId to verify roleId is not an ancestor.
   */
  private async checkCircularInheritance(roleId: string, targetParentId: string): Promise<boolean> {
    let currentParentId: string | null = targetParentId;
    const visited = new Set<string>();

    while (currentParentId) {
      if (currentParentId === roleId) {
        return true; // Circular loop detected
      }
      if (visited.has(currentParentId)) {
        return true; // Break existing cycle if corrupt
      }
      visited.add(currentParentId);

      const parentRole = await roleRepository.findById(currentParentId);
      currentParentId = parentRole?.parentId || null;
    }

    return false;
  }

  /**
   * List roles with pagination, search, and filtering.
   */
  async getRoles(params: RoleFilterParams) {
    return roleRepository.findMany(params);
  }

  /**
   * Get single role by ID with parent, children, and permissions.
   */
  async getRoleById(id: string) {
    const role = await roleRepository.findById(id);
    if (!role) {
      throw new AppError("Role record not found", 404);
    }
    return role;
  }

  /**
   * Create a new custom role.
   */
  async createRole(input: CreateRoleInput) {
    const formattedCode = input.code.toUpperCase().trim();

    const existing = await roleRepository.findByCode(formattedCode);
    if (existing) {
      throw new AppError(`Role code '${formattedCode}' already exists`, 409);
    }

    if (input.parentId) {
      const parentRole = await roleRepository.findById(input.parentId);
      if (!parentRole) {
        throw new AppError("Specified parent role not found", 404);
      }
    }

    return roleRepository.create({
      code: formattedCode,
      name: input.name,
      description: input.description || null,
      level: input.level ?? 0,
      isSystem: false,
      isBuiltIn: false,
      isActive: input.isActive ?? true,
      parentRole: input.parentId ? { connect: { id: input.parentId } } : undefined,
    });
  }

  /**
   * Update role metadata and parent hierarchy.
   */
  async updateRole(id: string, input: UpdateRoleInput) {
    const role = await roleRepository.findById(id);
    if (!role) {
      throw new AppError("Role record not found", 404);
    }

    if (input.parentId !== undefined && input.parentId !== null) {
      // 1. Self parenting check
      if (input.parentId === id) {
        throw new AppError("A role cannot be assigned as its own parent", 400);
      }

      // 2. Circular hierarchy check
      const isCircular = await this.checkCircularInheritance(id, input.parentId);
      if (isCircular) {
        throw new AppError("Circular role hierarchy inheritance detected", 400);
      }

      const parentRole = await roleRepository.findById(input.parentId);
      if (!parentRole) {
        throw new AppError("Specified parent role not found", 404);
      }
    }

    return roleRepository.update(id, {
      name: input.name !== undefined ? input.name : role.name,
      description: input.description !== undefined ? input.description : role.description,
      level: input.level !== undefined ? input.level : role.level,
      parentRole:
        input.parentId === null
          ? { disconnect: true }
          : input.parentId
          ? { connect: { id: input.parentId } }
          : undefined,
    });
  }

  /**
   * Toggle role active/disabled status.
   */
  async toggleRoleStatus(id: string, isActive: boolean) {
    const role = await roleRepository.findById(id);
    if (!role) {
      throw new AppError("Role record not found", 404);
    }

    if (role.isSystem && !isActive) {
      throw new AppError("System built-in core roles cannot be disabled", 403);
    }

    return roleRepository.update(id, { isActive });
  }

  /**
   * Soft delete a custom role definition.
   */
  async deleteRole(id: string) {
    const role = await roleRepository.findById(id);
    if (!role) {
      throw new AppError("Role record not found", 404);
    }

    if (role.isSystem) {
      throw new AppError("System built-in core roles cannot be deleted", 403);
    }

    const userCount = await roleRepository.countUserAssignments(id);
    if (userCount > 0) {
      throw new AppError(`Cannot delete role assigned to ${userCount} active user account(s)`, 400);
    }

    const permissionCount = await roleRepository.countPermissionAssignments(id);
    if (permissionCount > 0) {
      throw new AppError(
        `Cannot delete role with ${permissionCount} active assigned permission(s). Please remove permission assignments first.`,
        400
      );
    }

    return roleRepository.softDelete(id);
  }

  /**
   * Retrieve active permissions assigned to a role.
   */
  async getRolePermissions(roleId: string) {
    const role = await roleRepository.findById(roleId);
    if (!role) {
      throw new AppError("Role record not found", 404);
    }
    return roleRepository.getRolePermissions(roleId);
  }

  /**
   * Assign a permission to a role.
   */
  async assignPermissionToRole(roleId: string, permissionId: string) {
    const role = await roleRepository.findById(roleId);
    if (!role) {
      throw new AppError("Role record not found", 404);
    }

    const permission = await permissionRepository.findById(permissionId);
    if (!permission) {
      throw new AppError("Permission record not found", 404);
    }

    return roleRepository.assignPermission(roleId, permissionId);
  }

  /**
   * Remove a permission from a role.
   */
  async removePermissionFromRole(roleId: string, permissionId: string) {
    const role = await roleRepository.findById(roleId);
    if (!role) {
      throw new AppError("Role record not found", 404);
    }

    const permission = await permissionRepository.findById(permissionId);
    if (!permission) {
      throw new AppError("Permission record not found", 404);
    }

    if (role.code === "SUPER_ADMIN_ROLE" && permission.code.startsWith("system:")) {
      throw new AppError("Critical system core permissions cannot be revoked from Super Administrator role", 403);
    }

    return roleRepository.removePermission(roleId, permissionId);
  }
}

export const roleManagementService = new RoleManagementService();
export default roleManagementService;
