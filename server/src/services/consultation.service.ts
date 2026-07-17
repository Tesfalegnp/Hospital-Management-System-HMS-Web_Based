import { AppointmentStatus, Prisma } from '@prisma/client';
import { consultationRepository } from '../repositories/consultation.repository.js';
import { appointmentRepository } from '../repositories/appointment.repository.js';
import { patientRepository } from '../repositories/patient.repository.js';
import { doctorRepository } from '../repositories/doctor.repository.js';
import { branchRepository } from '../repositories/branch.repository.js';
import prisma from '../database/prisma.js';
import { AppError } from '../utils/AppError.js';

export class ConsultationService {
  /**
   * Records a new clinical encounter/consultation.
   * If an appointmentId is provided, transitions the appointment to COMPLETED inside a transaction.
   */
  async recordEncounter(data: {
    patientId: string;
    doctorId: string;
    branchId: string;
    appointmentId?: string;
    bloodPressure?: string;
    heartRate?: number;
    temperature?: number | string;
    respiratoryRate?: number;
    weight?: number | string;
    chiefComplaint?: string;
    physicalExamination?: string;
    diagnosis?: string;
    treatmentPlan?: string;
  }) {
    // 1. Verify entities exist and are not soft-deleted
    const [patient, doctor, branch] = await Promise.all([
      patientRepository.findById(data.patientId),
      doctorRepository.findById(data.doctorId),
      branchRepository.findById(data.branchId),
    ]);

    if (!patient) throw new AppError('Patient not found', 404);
    if (!doctor) throw new AppError('Doctor not found', 404);
    if (!branch) throw new AppError('Branch not found', 404);

    const tempDecimal = data.temperature !== undefined && data.temperature !== null
      ? new Prisma.Decimal(data.temperature)
      : undefined;
    const weightDecimal = data.weight !== undefined && data.weight !== null
      ? new Prisma.Decimal(data.weight)
      : undefined;

    // 2. If appointmentId is provided, validate and perform database transaction
    if (data.appointmentId) {
      const appointment = await appointmentRepository.findById(data.appointmentId);
      if (!appointment) throw new AppError('Appointment not found', 404);

      // Validate appointment references match
      if (appointment.patientId !== data.patientId) {
        throw new AppError('Appointment patient mismatch', 400);
      }
      if (appointment.doctorId !== data.doctorId) {
        throw new AppError('Appointment doctor mismatch', 400);
      }
      if (appointment.branchId !== data.branchId) {
        throw new AppError('Appointment branch mismatch', 400);
      }

      // Check if appointment is already completed/cancelled
      if (
        appointment.status === AppointmentStatus.COMPLETED ||
        appointment.status === AppointmentStatus.CANCELLED
      ) {
        throw new AppError(`Cannot complete an appointment that is already ${appointment.status.toLowerCase()}`, 400);
      }

      // Execute transaction
      return prisma.$transaction(async (tx) => {
        const consultation = await consultationRepository.create({
          patientId: data.patientId,
          doctorId: data.doctorId,
          branchId: data.branchId,
          appointmentId: data.appointmentId,
          bloodPressure: data.bloodPressure,
          heartRate: data.heartRate,
          temperature: tempDecimal,
          respiratoryRate: data.respiratoryRate,
          weight: weightDecimal,
          chiefComplaint: data.chiefComplaint,
          physicalExamination: data.physicalExamination,
          diagnosis: data.diagnosis,
          treatmentPlan: data.treatmentPlan,
        }, tx);

        await appointmentRepository.update(data.appointmentId!, {
          status: AppointmentStatus.COMPLETED,
        }, tx);

        return consultation;
      });
    }

    // 3. If no appointmentId is provided, save directly
    return consultationRepository.create({
      patientId: data.patientId,
      doctorId: data.doctorId,
      branchId: data.branchId,
      bloodPressure: data.bloodPressure,
      heartRate: data.heartRate,
      temperature: tempDecimal,
      respiratoryRate: data.respiratoryRate,
      weight: weightDecimal,
      chiefComplaint: data.chiefComplaint,
      physicalExamination: data.physicalExamination,
      diagnosis: data.diagnosis,
      treatmentPlan: data.treatmentPlan,
    });
  }

  /**
   * Updates clinical details, vitals, or treatment plans for a consultation.
   */
  async updateEncounter(
    id: string,
    data: {
      bloodPressure?: string;
      heartRate?: number;
      temperature?: number | string;
      respiratoryRate?: number;
      weight?: number | string;
      chiefComplaint?: string;
      physicalExamination?: string;
      diagnosis?: string;
      treatmentPlan?: string;
    }
  ) {
    const consultation = await consultationRepository.findById(id);
    if (!consultation) {
      throw new AppError('Consultation not found', 404);
    }

    const tempDecimal = data.temperature !== undefined && data.temperature !== null
      ? new Prisma.Decimal(data.temperature)
      : undefined;
    const weightDecimal = data.weight !== undefined && data.weight !== null
      ? new Prisma.Decimal(data.weight)
      : undefined;

    return consultationRepository.update(id, {
      bloodPressure: data.bloodPressure,
      heartRate: data.heartRate,
      temperature: tempDecimal,
      respiratoryRate: data.respiratoryRate,
      weight: weightDecimal,
      chiefComplaint: data.chiefComplaint,
      physicalExamination: data.physicalExamination,
      diagnosis: data.diagnosis,
      treatmentPlan: data.treatmentPlan,
    });
  }

  /**
   * Retrieves previous consultations for a patient sorted by date descending.
   */
  async getPatientHistory(patientId: string) {
    const patient = await patientRepository.findById(patientId);
    if (!patient) {
      throw new AppError('Patient not found', 404);
    }

    const consultations = await consultationRepository.findMany({
      patientId,
      limit: 100, // Fetch up to 100 historical encounters
    });

    return consultations.data;
  }
}

export const consultationService = new ConsultationService();
