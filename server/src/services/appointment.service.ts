import { AppointmentStatus } from '@prisma/client';
import { appointmentRepository } from '../repositories/appointment.repository.js';
import { patientRepository } from '../repositories/patient.repository.js';
import { doctorRepository } from '../repositories/doctor.repository.js';
import { branchRepository } from '../repositories/branch.repository.js';
import { AppError } from '../utils/AppError.js';

export class AppointmentService {
  /**
   * Creates a new appointment after verifying dependencies and checking for conflicts.
   */
  async createAppointment(data: {
    patientId: string;
    doctorId: string;
    branchId: string;
    departmentId?: string;
    appointmentDate: Date | string;
    startTime: Date | string;
    endTime: Date | string;
    reason?: string;
    notes?: string;
  }) {
    // Data Normalization
    const appointmentDate = new Date(data.appointmentDate);
    const startTime = new Date(data.startTime);
    const endTime = new Date(data.endTime);

    if (startTime >= endTime) {
      throw new AppError('Start time must be before end time', 400);
    }

    // Validation: Verify entities exist and are not soft-deleted
    const [patient, doctor, branch] = await Promise.all([
      patientRepository.findById(data.patientId),
      doctorRepository.findById(data.doctorId),
      branchRepository.findById(data.branchId),
    ]);

    if (!patient) throw new AppError('Patient not found', 404);
    if (!doctor) throw new AppError('Doctor not found', 404);
    if (!branch) throw new AppError('Branch not found', 404);

    // Conflict Check: Check for overlapping appointments
    const conflict = await appointmentRepository.checkOverlap(data.doctorId, startTime, endTime);
    if (conflict) {
      throw new AppError('Doctor is already booked at this time', 409);
    }

    // Create the appointment
    return appointmentRepository.create({
      patientId: data.patientId,
      doctorId: data.doctorId,
      branchId: data.branchId,
      departmentId: data.departmentId,
      appointmentDate,
      startTime,
      endTime,
      reason: data.reason,
      notes: data.notes,
      status: AppointmentStatus.SCHEDULED,
    });
  }

  /**
   * Reschedules an existing appointment to a new time.
   */
  async rescheduleAppointment(appointmentId: string, newStartTime: Date | string, newEndTime: Date | string) {
    const startTime = new Date(newStartTime);
    const endTime = new Date(newEndTime);

    if (startTime >= endTime) {
      throw new AppError('Start time must be before end time', 400);
    }

    const appointment = await appointmentRepository.findById(appointmentId);
    if (!appointment) {
      throw new AppError('Appointment not found', 404);
    }

    if (appointment.status === AppointmentStatus.CANCELLED || appointment.status === AppointmentStatus.COMPLETED) {
      throw new AppError(`Cannot reschedule a ${appointment.status.toLowerCase()} appointment`, 400);
    }

    // Conflict Check: Excluding the current appointment
    const conflict = await appointmentRepository.checkOverlap(appointment.doctorId, startTime, endTime, appointmentId);
    if (conflict) {
      throw new AppError('Doctor is already booked at the new requested time', 409);
    }

    return appointmentRepository.update(appointmentId, {
      startTime,
      endTime,
      appointmentDate: startTime, // Normalize appointmentDate based on new startTime
      status: AppointmentStatus.SCHEDULED, // Reset status if it was confirmed, etc.
    });
  }

  /**
   * Cancels an appointment.
   */
  async cancelAppointment(appointmentId: string, cancelReason?: string) {
    const appointment = await appointmentRepository.findById(appointmentId);
    if (!appointment) {
      throw new AppError('Appointment not found', 404);
    }

    if (appointment.status === AppointmentStatus.CANCELLED) {
      throw new AppError('Appointment is already cancelled', 400);
    }

    const updatedNotes = cancelReason 
      ? `${appointment.notes ? appointment.notes + '\n' : ''}Cancellation Reason: ${cancelReason}`
      : appointment.notes;

    return appointmentRepository.update(appointmentId, {
      status: AppointmentStatus.CANCELLED,
      notes: updatedNotes,
    });
  }

  /**
   * Gets the schedule for a specific doctor on a given date.
   */
  async getDoctorSchedule(doctorId: string, date: Date | string) {
    const targetDate = new Date(date);
    
    // Set start of day and end of day for the query
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const doctor = await doctorRepository.findById(doctorId);
    if (!doctor) {
      throw new AppError('Doctor not found', 404);
    }

    const appointments = await appointmentRepository.findMany({
      doctorId,
      startDate: startOfDay,
      endDate: endOfDay,
      limit: 100, // Fetch all for the day
    });

    return appointments.data;
  }
}

export const appointmentService = new AppointmentService();
