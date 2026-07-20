import prisma from "../database/prisma.js";
import { Prisma, User, Role } from "@prisma/client";

export class UserRepository {
  /**
   * Finds a user by email.
   * Excludes soft-deleted users.
   */
  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: {
        email,
        deletedAt: null,
      },
    });
  }

  /**
   * Finds a user by ID.
   * Excludes soft-deleted users.
   */
  async findById(id: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });
  }

  /**
   * Creates a new user.
   */
  async create(data: Prisma.UserCreateInput): Promise<User> {
    return prisma.user.create({
      data,
    });
  }

  /**
   * Updates an existing user (such as saving/clearing tokens).
   */
  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return prisma.user.update({
      where: { id },
      data,
    });
  }

  /**
   * Retrieves paginated users list with search and dynamic filtering.
   */
  async findMany(filters: {
    role?: Role;
    branchId?: string;
    departmentId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {
      deletedAt: null,
    };

    if (filters.role) {
      where.role = filters.role;
    }
    if (filters.branchId) {
      where.branchId = filters.branchId;
    }
    if (filters.departmentId) {
      where.departmentId = filters.departmentId;
    }
    if (filters.search) {
      where.OR = [
        { firstName: { contains: filters.search, mode: "insensitive" } },
        { lastName: { contains: filters.search, mode: "insensitive" } },
        { email: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          branch: { select: { id: true, name: true } },
          department: { select: { id: true, name: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

export const userRepository = new UserRepository();
