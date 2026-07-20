import bcrypt from "bcrypt";
import prisma from "../database/prisma.js";
import { userRepository } from "../repositories/user.repository.js";
import { AppError } from "../utils/AppError.js";
import { Role, Gender, User, Prisma } from "@prisma/client";

export class UserService {
  /**
   * List users with optional paginated filters.
   */
  async getUsers(filters: {
    role?: Role;
    branchId?: string;
    departmentId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    return userRepository.findMany(filters);
  }

  /**
   * Create a new user account.
   */
  async createUser(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: Role;
    gender?: Gender | null;
    phone?: string | null;
    branchId?: string | null;
    departmentId?: string | null;
  }): Promise<User> {
    const existing = await userRepository.findByEmail(data.email);
    if (existing) {
      throw new AppError("Email address is already registered", 400);
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const createData: Prisma.UserCreateInput = {
      email: data.email,
      password: hashedPassword,
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role,
      gender: data.gender || null,
      phone: data.phone || null,
      isActive: true,
    };

    if (data.branchId) {
      createData.branch = { connect: { id: data.branchId } };
    }
    if (data.departmentId) {
      createData.department = { connect: { id: data.departmentId } };
    }

    return userRepository.create(createData);
  }

  /**
   * Edit user account details.
   */
  async updateUser(
    id: string,
    data: {
      firstName?: string;
      lastName?: string;
      role?: Role;
      gender?: Gender | null;
      phone?: string | null;
      branchId?: string | null;
      departmentId?: string | null;
      isActive?: boolean;
    }
  ): Promise<User> {
    const user = await userRepository.findById(id);
    if (!user) {
      throw new AppError("User account not found", 404);
    }

    const updateData: Prisma.UserUpdateInput = {
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role,
      gender: data.gender,
      phone: data.phone,
      isActive: data.isActive,
    };

    if (data.branchId !== undefined) {
      updateData.branch = data.branchId ? { connect: { id: data.branchId } } : { disconnect: true };
    }
    if (data.departmentId !== undefined) {
      updateData.department = data.departmentId ? { connect: { id: data.departmentId } } : { disconnect: true };
    }

    return userRepository.update(id, updateData);
  }

  /**
   * Resets a user password.
   */
  async resetPassword(id: string, newPassword: string): Promise<User> {
    const user = await userRepository.findById(id);
    if (!user) {
      throw new AppError("User account not found", 404);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    return userRepository.update(id, { password: hashedPassword });
  }

  /**
   * Retrieves active clinic branches for lookups.
   */
  async getBranchesLookup() {
    return prisma.branch.findMany({
      where: { deletedAt: null, isActive: true },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    });
  }

  /**
   * Retrieves active clinic departments for lookups.
   */
  async getDepartmentsLookup() {
    return prisma.department.findMany({
      where: { deletedAt: null, isActive: true },
      select: { id: true, name: true, branchId: true },
      orderBy: { name: "asc" },
    });
  }
}

export const userService = new UserService();
