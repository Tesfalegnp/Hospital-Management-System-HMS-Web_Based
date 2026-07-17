import prisma from '../database/prisma.js';
import { Prisma, Consultation } from '@prisma/client';

export class ConsultationRepository {
  /**
   * Creates a new consultation record.
   * Supports execution within an existing Prisma transaction.
   */
  async create(
    data: Prisma.ConsultationUncheckedCreateInput | Prisma.ConsultationCreateInput,
    tx?: Prisma.TransactionClient
  ): Promise<Consultation> {
    const client = tx || prisma;
    return client.consultation.create({
      data,
      include: {
        patient: {
          include: { user: true },
        },
        doctor: {
          include: { user: true },
        },
        appointment: true,
        branch: true,
      },
    });
  }

  /**
   * Finds a consultation by ID.
   * Excludes soft-deleted records.
   */
  async findById(id: string) {
    return prisma.consultation.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        patient: {
          include: { user: true },
        },
        doctor: {
          include: { user: true },
        },
        appointment: true,
        branch: true,
      },
    });
  }

  /**
   * Retrieves a list of consultations based on filters.
   * Supports cursor-based pagination and date filtering.
   */
  async findMany(filters: {
    patientId?: string;
    doctorId?: string;
    branchId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    cursor?: string;
  }) {
    const { patientId, doctorId, branchId, startDate, endDate, limit = 10, cursor } = filters;

    const where: Prisma.ConsultationWhereInput = {
      deletedAt: null,
    };

    if (patientId) where.patientId = patientId;
    if (doctorId) where.doctorId = doctorId;
    if (branchId) where.branchId = branchId;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const items = await prisma.consultation.findMany({
      where,
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        patient: {
          include: { user: true },
        },
        doctor: {
          include: { user: true },
        },
        appointment: true,
      },
    });

    let nextCursor: string | undefined = undefined;
    if (items.length > limit) {
      const nextItem = items.pop();
      nextCursor = nextItem?.id;
    }

    return {
      data: items,
      nextCursor,
    };
  }

  /**
   * Updates an existing consultation record.
   * Supports execution within an existing Prisma transaction.
   */
  async update(
    id: string,
    data: Prisma.ConsultationUncheckedUpdateInput | Prisma.ConsultationUpdateInput,
    tx?: Prisma.TransactionClient
  ): Promise<Consultation> {
    const client = tx || prisma;
    return client.consultation.update({
      where: { id },
      data,
      include: {
        patient: {
          include: { user: true },
        },
        doctor: {
          include: { user: true },
        },
        appointment: true,
        branch: true,
      },
    });
  }

  /**
   * Performs a soft delete on the consultation record.
   */
  async softDelete(id: string): Promise<Consultation> {
    return prisma.consultation.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });
  }
}

export const consultationRepository = new ConsultationRepository();
