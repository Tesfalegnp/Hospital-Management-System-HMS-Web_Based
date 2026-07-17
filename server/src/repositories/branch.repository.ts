import prisma from '../database/prisma.js';

export class BranchRepository {
  async findById(id: string) {
    return prisma.branch.findFirst({ where: { id, deletedAt: null } });
  }
}
export const branchRepository = new BranchRepository();
