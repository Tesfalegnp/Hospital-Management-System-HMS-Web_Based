import prisma from "../database/prisma.js";
import { Prisma } from "@prisma/client";

export interface PermissionFilterParams {
  search?: string;
  module?: string;
  category?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export class PermissionRepository {
  /**
   * Find paginated permissions with search and category filters.
   */
  async findMany(params: PermissionFilterParams) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.max(1, Math.min(100, params.limit || 10));
    const skip = (page - 1) * limit;

    const where: Prisma.PermissionWhereInput = {
      deletedAt: null,
    };

    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: "insensitive" } },
        { code: { contains: params.search, mode: "insensitive" } },
        { description: { contains: params.search, mode: "insensitive" } },
        { resource: { contains: params.search, mode: "insensitive" } },
      ];
    }

    if (params.module) {
      where.module = params.module;
    }

    if (params.category) {
      where.category = params.category;
    }

    if (params.isActive !== undefined) {
      where.isActive = params.isActive;
    }

    const orderBy: Prisma.PermissionOrderByWithRelationInput = {
      [params.sortBy || "createdAt"]: params.sortOrder || "desc",
    };

    const [data, total] = await Promise.all([
      prisma.permission.findMany({
        where,
        skip,
        take: limit,
        orderBy,
      }),
      prisma.permission.count({ where }),
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
   * Find permission by CUID ID.
   */
  async findById(id: string) {
    return prisma.permission.findFirst({
      where: { id, deletedAt: null },
    });
  }

  /**
   * Find permission by unique code.
   */
  async findByCode(code: string) {
    return prisma.permission.findFirst({
      where: { code, deletedAt: null },
    });
  }

  /**
   * Create a new permission.
   */
  async create(data: Prisma.PermissionCreateInput) {
    return prisma.permission.create({
      data,
    });
  }

  /**
   * Update an existing permission.
   */
  async update(id: string, data: Prisma.PermissionUpdateInput) {
    return prisma.permission.update({
      where: { id },
      data,
    });
  }

  /**
   * Soft delete a permission.
   */
  async softDelete(id: string) {
    return prisma.permission.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });
  }
}

export const permissionRepository = new PermissionRepository();
export default permissionRepository;
