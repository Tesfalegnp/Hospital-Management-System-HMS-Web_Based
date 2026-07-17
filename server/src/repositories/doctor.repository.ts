import prisma from '../database/prisma.js';

export class DoctorRepository {
  async findById(id: string) {
    return prisma.doctor.findFirst({ where: { id, deletedAt: null } });
  }
}
export const doctorRepository = new DoctorRepository();
