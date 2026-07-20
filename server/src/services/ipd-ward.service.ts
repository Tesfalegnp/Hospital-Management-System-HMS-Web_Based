import { ipdRepository } from "../repositories/ipd.repository.js";
import { AppError } from "../utils/AppError.js";
import { BedStatus } from "@prisma/client";
import prisma from "../database/prisma.js";

export class IpdWardService {
  /**
   * Configure a new ward in a branch clinic.
   */
  async createWard(data: {
    branchId: string;
    name: string;
    code: string;
    dailyTariffCode: string;
  }) {
    const branch = await prisma.branch.findUnique({ where: { id: data.branchId } });
    if (!branch || branch.deletedAt) {
      throw new AppError("Branch clinic not found", 404);
    }
    return ipdRepository.createWard(data);
  }

  /**
   * Configure a new Bed inside a Ward.
   */
  async createBed(data: { wardId: string; bedNumber: string }) {
    const ward = await prisma.ward.findUnique({ where: { id: data.wardId } });
    if (!ward || ward.deletedAt) {
      throw new AppError("Ward not found", 404);
    }
    return ipdRepository.createBed(data);
  }

  /**
   * Fetch configured wards.
   */
  async getWards(filters: { branchId?: string; page?: number; limit?: number }) {
    return ipdRepository.findWards(filters);
  }

  /**
   * Process patient admission checking clinical availability.
   */
  async admitPatient(data: {
    patientId: string;
    admittingDoctorId: string;
    bedId: string;
  }) {
    // 1. Verify Patient exists
    const patient = await prisma.patient.findUnique({ where: { id: data.patientId } });
    if (!patient || patient.deletedAt) {
      throw new AppError("Patient chart record not found", 404);
    }

    // 2. Verify Doctor exists
    const doctor = await prisma.doctor.findUnique({ where: { id: data.admittingDoctorId } });
    if (!doctor || doctor.deletedAt) {
      throw new AppError("Attending physician record not found", 404);
    }

    // 3. Verify Bed is AVAILABLE
    const bed = await prisma.bed.findUnique({ where: { id: data.bedId } });
    if (!bed || bed.deletedAt) {
      throw new AppError("Bed not found", 404);
    }
    if (bed.status !== "AVAILABLE") {
      throw new AppError(`Bed is currently occupied or unavailable (Status: ${bed.status})`, 400);
    }

    // 4. Verify patient does not have an active open admission
    const activeAdmission = await prisma.admission.findFirst({
      where: { patientId: data.patientId, status: "ADMITTED" },
    });
    if (activeAdmission) {
      throw new AppError("Patient is already admitted to another bed ward", 400);
    }

    return ipdRepository.admitPatient(data);
  }

  /**
   * Fetch list of actively hospitalized patients.
   */
  async getActiveAdmissions(filters: {
    wardId?: string;
    branchId?: string;
    page?: number;
    limit?: number;
  }) {
    return ipdRepository.findActiveAdmissions(filters);
  }

  /**
   * Fetch details of a patient's admission chart.
   */
  async getAdmissionById(id: string) {
    const admission = await ipdRepository.findAdmissionById(id);
    if (!admission) {
      throw new AppError("Admission record not found", 404);
    }
    return admission;
  }

  /**
   * Process an inter-ward bed transfer.
   */
  async transferPatient(admissionId: string, targetBedId: string) {
    // Verify target bed is AVAILABLE
    const bed = await prisma.bed.findUnique({ where: { id: targetBedId } });
    if (!bed || bed.deletedAt) {
      throw new AppError("Target bed not found", 404);
    }
    if (bed.status !== "AVAILABLE") {
      throw new AppError(`Target bed is occupied or cleaning (Status: ${bed.status})`, 400);
    }

    return ipdRepository.transferPatient(admissionId, targetBedId);
  }

  /**
   * Complete patient clinical discharge.
   */
  async dischargePatient(admissionId: string, dischargeNotes?: string | null) {
    return ipdRepository.dischargePatient(admissionId, dischargeNotes);
  }

  /**
   * Log periodic nursing vital signs.
   */
  async logVitals(data: {
    admissionId: string;
    recordedById: string;
    temperature?: number | null;
    bloodPressure?: string | null;
    heartRate?: number | null;
    respiratoryRate?: number | null;
    oxygenSaturation?: number | null;
    notes?: string | null;
  }) {
    const admission = await prisma.admission.findUnique({ where: { id: data.admissionId } });
    if (!admission || admission.status !== "ADMITTED") {
      throw new AppError("Active admission chart not found", 404);
    }
    return ipdRepository.logVitals(data);
  }

  /**
   * Clear bed cleaning status back to AVAILABLE.
   */
  async clearBedCleaning(bedId: string) {
    const bed = await prisma.bed.findUnique({ where: { id: bedId } });
    if (!bed || bed.deletedAt) {
      throw new AppError("Bed not found", 404);
    }
    if (bed.status !== "CLEANING") {
      throw new AppError(`Bed is not in CLEANING state (Status: ${bed.status})`, 400);
    }
    return ipdRepository.updateBedStatus(bedId, "AVAILABLE");
  }
}

export const ipdWardService = new IpdWardService();
