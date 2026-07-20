import { prescriptionRepository } from "../repositories/prescription.repository.js";
import { AppError } from "../utils/AppError.js";
import { PrescriptionStatus } from "@prisma/client";
import prisma from "../database/prisma.js";

export class PrescriptionDispenseService {
  /**
   * Register a new prescription.
   */
  async createPrescription(data: {
    patientId: string;
    doctorId: string;
    encounterId?: string | null;
    notes?: string | null;
    items: {
      medicineId: string;
      quantity: number;
      dosageInstruction: string;
      routeId: string;
    }[];
  }) {
    // Verify patient exists
    const patient = await prisma.patient.findUnique({ where: { id: data.patientId } });
    if (!patient || patient.deletedAt) {
      throw new AppError("Patient chart record not found", 404);
    }

    // Verify doctor exists
    const doctor = await prisma.doctor.findUnique({ where: { id: data.doctorId } });
    if (!doctor || doctor.deletedAt) {
      throw new AppError("Doctor record not found", 404);
    }

    return prescriptionRepository.createPrescription(data);
  }

  /**
   * Get active prescriptions queue.
   */
  async getPrescriptionQueue(filters: {
    status?: PrescriptionStatus;
    patientId?: string;
    page?: number;
    limit?: number;
  }) {
    return prescriptionRepository.findPrescriptions(filters);
  }

  /**
   * Get detail information for prescription.
   */
  async getPrescriptionById(id: string) {
    const rx = await prescriptionRepository.findById(id);
    if (!rx) {
      throw new AppError("Prescription record not found", 404);
    }
    return rx;
  }

  /**
   * Execute dispensing logic. Enforces clinical validation rules and co-signer checking.
   */
  async dispensePrescription(
    prescriptionId: string,
    data: {
      pharmacistId: string;
      witnessId?: string | null;
      notes?: string | null;
      items: {
        prescriptionItemId: string;
        medicineBatchId: string;
        quantityDispensed: number;
      }[];
    }
  ) {
    const rx = await prescriptionRepository.findById(prescriptionId);
    if (!rx) {
      throw new AppError("Prescription record not found", 404);
    }

    if (rx.status === "DISPENSED") {
      throw new AppError("Cannot dispense a prescription that has already been fully dispensed", 400);
    }

    if (rx.status === "CANCELLED") {
      throw new AppError("Cannot dispense a cancelled prescription", 400);
    }

    // If a co-signer witness is provided, verify they have clinical permissions
    if (data.witnessId) {
      if (data.witnessId === data.pharmacistId) {
        throw new AppError("The dispensing pharmacist cannot act as their own co-signing witness", 400);
      }

      const witness = await prisma.user.findFirst({
        where: { id: data.witnessId, deletedAt: null }
      });

      if (!witness) {
        throw new AppError("Witness co-signer not found in user database", 404);
      }

      const validWitnessRoles = ["DOCTOR", "PHARMACIST", "ADMIN", "SUPER_ADMIN"];
      if (!validWitnessRoles.includes(witness.role)) {
        throw new AppError("Witness co-signer must hold a clinical role (Doctor, Pharmacist, or Admin)", 400);
      }
    }

    return prescriptionRepository.dispensePrescription(prescriptionId, data);
  }
}

export const prescriptionDispenseService = new PrescriptionDispenseService();
