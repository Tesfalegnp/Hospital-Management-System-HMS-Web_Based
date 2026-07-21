import prisma from "../database/prisma.js";
import { Prisma } from "@prisma/client";

export class UserRoleRepository {
  /**
   * Find active role assignments for a user.
   */
  async findManyByUser(userId: string) {
    return prisma.userRole.findMany({
      where: {
        userId,
        deletedAt: null,
      },
      include: {
        role: {
          select: {
            id: true,
            code: true,
            name: true,
            level: true,
            isActive: true,
            isSystem: true,
          },
        },
        hospital: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        branch: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  /**
   * Find a role assignment by ID.
   */
  async findById(id: string) {
    return prisma.userRole.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        role: true,
        user: true,
      },
    });
  }

  /**
   * Find existing active or soft-deleted assignment.
   */
  async findAssignment(userId: string, roleId: string, hospitalId?: string | null, branchId?: string | null) {
    return prisma.userRole.findFirst({
      where: {
        userId,
        roleId,
        hospitalId: hospitalId || null,
        branchId: branchId || null,
      },
    });
  }

  /**
   * Assign a role to a user. Supports restoring soft-deleted assignments.
   */
  async assignRole(data: { userId: string; roleId: string; hospitalId?: string | null; branchId?: string | null }) {
    const existing = await this.findAssignment(data.userId, data.roleId, data.hospitalId, data.branchId);
    if (existing) {
      return prisma.userRole.update({
        where: { id: existing.id },
        data: {
          deletedAt: null,
        },
        include: {
          role: true,
          hospital: true,
          branch: true,
        },
      });
    }

    return prisma.userRole.create({
      data: {
        userId: data.userId,
        roleId: data.roleId,
        hospitalId: data.hospitalId || null,
        branchId: data.branchId || null,
      },
      include: {
        role: true,
        hospital: true,
        branch: true,
      },
    });
  }

  /**
   * Revoke a role assignment (soft-delete).
   */
  async revokeRole(id: string) {
    return prisma.userRole.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  /**
   * Count active SUPER_ADMIN_ROLE assignments.
   */
  async countActiveSuperAdmins(): Promise<number> {
    const superAdminRole = await prisma.roleDefinition.findFirst({
      where: {
        code: "SUPER_ADMIN_ROLE",
        deletedAt: null,
      },
    });

    if (!superAdminRole) return 0;

    return prisma.userRole.count({
      where: {
        roleId: superAdminRole.id,
        deletedAt: null,
        user: {
          isActive: true,
          deletedAt: null,
        },
      },
    });
  }
}

export const userRoleRepository = new UserRoleRepository();
export default userRoleRepository;
