import { permissionRepository, PermissionFilterParams } from "../repositories/permission.repository.js";
import { AppError } from "../utils/AppError.js";

export interface CreatePermissionInput {
  module: string;
  resource: string;
  action: string;
  name: string;
  description?: string;
  category: string;
}

export interface UpdatePermissionInput {
  name?: string;
  description?: string;
  category?: string;
}

export class PermissionManagementService {
  /**
   * List permissions with pagination, search, and category filters.
   */
  async getPermissions(params: PermissionFilterParams) {
    return permissionRepository.findMany(params);
  }

  /**
   * Retrieve a single permission by ID.
   */
  async getPermissionById(id: string) {
    const permission = await permissionRepository.findById(id);
    if (!permission) {
      throw new AppError("Permission record not found", 404);
    }
    return permission;
  }

  /**
   * Create a new permission. Automatically generates code = `${module}:${resource}:${action}`.
   */
  async createPermission(input: CreatePermissionInput) {
    const code = `${input.module.toLowerCase()}:${input.resource.toLowerCase()}:${input.action.toLowerCase()}`;

    const existing = await permissionRepository.findByCode(code);
    if (existing) {
      throw new AppError(`Permission code '${code}' already exists`, 409);
    }

    return permissionRepository.create({
      code,
      name: input.name,
      description: input.description || null,
      module: input.module.toLowerCase(),
      resource: input.resource.toLowerCase(),
      action: input.action.toLowerCase(),
      category: input.category,
      isSystem: false,
      isActive: true,
    });
  }

  /**
   * Update metadata (name, description, category) of an existing permission.
   */
  async updatePermission(id: string, input: UpdatePermissionInput) {
    const permission = await permissionRepository.findById(id);
    if (!permission) {
      throw new AppError("Permission record not found", 404);
    }

    return permissionRepository.update(id, {
      name: input.name !== undefined ? input.name : permission.name,
      description: input.description !== undefined ? input.description : permission.description,
      category: input.category !== undefined ? input.category : permission.category,
    });
  }

  /**
   * Toggle active/disabled status of a permission.
   */
  async togglePermissionStatus(id: string, isActive: boolean) {
    const permission = await permissionRepository.findById(id);
    if (!permission) {
      throw new AppError("Permission record not found", 404);
    }

    return permissionRepository.update(id, {
      isActive,
    });
  }

  /**
   * Soft delete a permission (Protected: System permissions cannot be deleted).
   */
  async deletePermission(id: string) {
    const permission = await permissionRepository.findById(id);
    if (!permission) {
      throw new AppError("Permission record not found", 404);
    }

    if (permission.isSystem) {
      throw new AppError("System built-in core permissions cannot be deleted", 403);
    }

    return permissionRepository.softDelete(id);
  }
}

export const permissionManagementService = new PermissionManagementService();
export default permissionManagementService;
