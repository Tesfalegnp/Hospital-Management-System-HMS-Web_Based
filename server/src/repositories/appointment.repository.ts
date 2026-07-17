import prisma from '../database/prisma.js';
import { Prisma, Appointment } from '@prisma/client';

export class AppointmentRepository {
  /**
   * Creates a new appointment.
   * @param data The appointment data to be created
   * @returns The created appointment with eager-loaded relations
   */
  async create(data: Prisma.AppointmentUncheckedCreateInput | Prisma.AppointmentCreateInput) {
    return prisma.appointment.create({
      data,
      include: {
        patient: {
          include: { user: true },
        },
        doctor: {
          include: { user: true },
        },
        branch: true,
        department: true,
      },
    });
  }

  /**
   * Finds a single appointment by its unique ID.
   * Excludes soft-deleted appointments.
   * @param id The ID of the appointment
   * @returns The appointment with eager-loaded relations, or null if not found
   */
  async findById(id: string) {
    return prisma.appointment.findFirst({
      where: { 
        id, 
        deletedAt: null 
      },
      include: {
        patient: {
          include: { user: true },
        },
        doctor: {
          include: { user: true },
        },
        branch: true,
        department: true,
      },
    });
  }

  /**
   * Retrieves a list of appointments based on specific filters.
   * Supports cursor-based pagination.
   * @param filters Filtering and pagination parameters
   * @returns An object containing the requested items and the next cursor (if available)
   */
  async findMany(filters: {
    branchId?: string;
    doctorId?: string;
    patientId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    cursor?: string;
  }) {
    const { branchId, doctorId, patientId, startDate, endDate, limit = 10, cursor } = filters;

    const where: Prisma.AppointmentWhereInput = {
      deletedAt: null, // Always exclude soft-deleted records
    };

    if (branchId) where.branchId = branchId;
    if (doctorId) where.doctorId = doctorId;
    if (patientId) where.patientId = patientId;

    if (startDate || endDate) {
      where.appointmentDate = {};
      if (startDate) where.appointmentDate.gte = startDate;
      if (endDate) where.appointmentDate.lte = endDate;
    }

    const items = await prisma.appointment.findMany({
      where,
      take: limit + 1, // Fetch one extra to determine if there's a next page
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: {
        appointmentDate: 'asc',
      },
      include: {
        patient: {
          include: { user: true },
        },
        doctor: {
          include: { user: true },
        },
        branch: true,
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
   * Checks if there are any overlapping appointments for a doctor within a given time frame.
   * Excludes cancelled or completed appointments.
   * @param doctorId The ID of the doctor
   * @param startTime The proposed start time
   * @param endTime The proposed end time
   * @param excludeAppointmentId Optional ID of an appointment to exclude from the check (useful for rescheduling)
   * @returns The overlapping appointment if one exists, otherwise null
   */
  async checkOverlap(doctorId: string, startTime: Date, endTime: Date, excludeAppointmentId?: string) {
    const where: Prisma.AppointmentWhereInput = {
      doctorId,
      deletedAt: null,
      status: {
        notIn: ['CANCELLED', 'NO_SHOW', 'COMPLETED']
      },
      AND: [
        { startTime: { lt: endTime } },
        { endTime: { gt: startTime } }
      ]
    };

    if (excludeAppointmentId) {
      where.id = { not: excludeAppointmentId };
    }

    return prisma.appointment.findFirst({ where });
  }

  /**
   * Updates an existing appointment.
   * @param id The ID of the appointment to update
   * @param data The fields to update
   * @returns The updated appointment with eager-loaded relations
   */
  async update(
    id: string, 
    data: Prisma.AppointmentUncheckedUpdateInput | Prisma.AppointmentUpdateInput,
    tx?: Prisma.TransactionClient
  ) {
    const client = tx || prisma;
    return client.appointment.update({
      where: { id },
      data,
      include: {
        patient: {
          include: { user: true },
        },
        doctor: {
          include: { user: true },
        },
        branch: true,
        department: true,
      },
    });
  }

  /**
   * Performs a soft delete by setting the deletedAt timestamp.
   * @param id The ID of the appointment to soft delete
   * @returns The soft-deleted appointment
   */
  async softDelete(id: string): Promise<Appointment> {
    return prisma.appointment.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });
  }
}

export const appointmentRepository = new AppointmentRepository();
