import prisma from "../database/prisma.js";
import { Prisma } from "@prisma/client";

export interface RoleFilterParams {
  search?: string;
  isActive?: boolean;
  isSystem?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export class RoleRepository {
  /**
   * Find paginated roles with search and filtering.
   */
  async findMany(params: RoleFilterParams) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.max(1, Math.min(100, params.limit || 10));
    const skip = (page - 1) * limit;

    const where: Prisma.RoleDefinitionWhereInput = {
      deletedAt: null,
    };

    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: "insensitive" } },
        { code: { contains: params.search, mode: "insensitive" } },
        { description: { contains: params.search, mode: "insensitive" } },
      ];
    }

    if (params.isActive !== undefined) {
      where.isActive = params.isActive;
    }

    if (params.isSystem !== undefined) {
      where.isSystem = params.isSystem;
    }

    const orderBy: Prisma.RoleDefinitionOrderByWithRelationInput = {
      [params.sortBy || "createdAt"]: params.sortOrder || "desc",
    };

    const [data, total] = await Promise.all([
      prisma.roleDefinition.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          parentRole: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
          _count: {
            select: {
              rolePermissions: { where: { deletedAt: null } },
              userRoles: { where: { deletedAt: null } },
            },
          },
        },
      }),
      prisma.roleDefinition.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  /**
   * Find role by CUID ID with parent/child roles and permissions included.
   */
  async findById(id: string) {
    return prisma.roleDefinition.findFirst({
      where: { id, deletedAt: null },
      include: {
        parentRole: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        childRoles: {
          where: { deletedAt: null },
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        rolePermissions: {
          where: { deletedAt: null },
          include: {
            permission: true,
          },
        },
      },
    });
  }

  /**
   * Find role by unique role code.
   */
  async findByCode(code: string) {
    return prisma.roleDefinition.findFirst({
      where: { code, deletedAt: null },
    });
  }

  /**
   * Create a new role definition.
   */
  async create(data: Prisma.RoleDefinitionCreateInput) {
    return prisma.roleDefinition.create({
      data,
      include: {
        parentRole: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });
  }

  /**
   * Update an existing role definition.
   */
  async update(id: string, data: Prisma.RoleDefinitionUpdateInput) {
    return prisma.roleDefinition.update({
      where: { id },
      data,
      include: {
        parentRole: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });
  }

  /**
   * Soft delete a role definition.
   */
  async softDelete(id: string) {
    return prisma.roleDefinition.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });
  }

  /**
   * Find all active permissions granted to a specific role.
   */
  async getRolePermissions(roleId: string) {
    return prisma.rolePermission.findMany({
      where: {
        roleId,
        deletedAt: null,
      },
      include: {
        permission: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  /**
   * Find existing RolePermission entry by roleId and permissionId (including soft-deleted).
   */
  async findRolePermission(roleId: string, permissionId: string) {
    return prisma.rolePermission.findFirst({
      where: {
        roleId,
        permissionId,
      },
    });
  }

  /**
   * Assign a permission to a role (upserting soft deleted entries).
   */
  async assignPermission(roleId: string, permissionId: string) {
    const existing = await this.findRolePermission(roleId, permissionId);
    if (existing) {
      return prisma.rolePermission.update({
        where: { id: existing.id },
        data: {
          deletedAt: null,
        },
        include: {
          permission: true,
        },
      });
    }

    return prisma.rolePermission.create({
      data: {
        roleId,
        permissionId,
      },
      include: {
        permission: true,
      },
    });
  }

  /**
   * Remove a permission from a role (soft delete junction record).
   */
  async removePermission(roleId: string, permissionId: string) {
    const existing = await this.findRolePermission(roleId, permissionId);
    if (!existing || existing.deletedAt) {
      return null;
    }

    return prisma.rolePermission.update({
      where: { id: existing.id },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  /**
   * Count active user assignments for a role.
   */
  async countUserAssignments(roleId: string): Promise<number> {
    return prisma.userRole.count({
      where: {
        roleId,
        deletedAt: null,
      },
    });
  }

  /**
   * Count active permission assignments for a role.
   */
  async countPermissionAssignments(roleId: string): Promise<number> {
    return prisma.rolePermission.count({
      where: {
        roleId,
        deletedAt: null,
      },
    });
  }
}

export const roleRepository = new RoleRepository();
export default roleRepository;
