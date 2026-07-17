import prisma from '../database/prisma.js';

export class PatientRepository {
  async findById(id: string) {
    return prisma.patient.findFirst({ where: { id, deletedAt: null } });
  }
}
export const patientRepository = new PatientRepository();
