import { medicineRepository } from "../repositories/medicine.repository.js";
import { patientRepository } from "../repositories/patient.repository.js";
import { AppError } from "../utils/AppError.js";
import { AllergySeverity } from "@prisma/client";

export class PharmacySafetyService {
  /**
   * Creates a new medicine entry in the formulary.
   */
  async createMedicine(data: {
    brandName: string;
    genericName: string;
    sku?: string | null;
    strength: string;
    description?: string | null;
    manufacturerId: string;
    categoryId: string;
    dosageFormId: string;
    storageLocationId?: string | null;
    approvedRouteIds: string[];
    interactions?: { medicineBId: string; severity: "CRITICAL" | "WARNING" | "INFORMATIONAL"; description: string }[];
  }) {
    return medicineRepository.create(data);
  }

  /**
   * Updates an existing medicine entry.
   */
  async updateMedicine(id: string, data: {
    brandName?: string;
    genericName?: string;
    sku?: string | null;
    strength?: string;
    description?: string | null;
    manufacturerId?: string;
    categoryId?: string;
    dosageFormId?: string;
    storageLocationId?: string | null;
    approvedRouteIds?: string[];
    interactions?: { medicineBId: string; severity: "CRITICAL" | "WARNING" | "INFORMATIONAL"; description: string }[];
  }) {
    const existing = await medicineRepository.findById(id);
    if (!existing) {
      throw new AppError("Medicine not found in formulary", 404);
    }
    return medicineRepository.update(id, data);
  }

  /**
   * Fetches the medicine formulary with paginated filtering.
   */
  async getMedicines(filters: {
    search?: string;
    categoryId?: string;
    manufacturerId?: string;
    page?: number;
    limit?: number;
  }) {
    return medicineRepository.findMany(filters);
  }

  /**
   * Fetches detailed formulary profile of a medicine.
   */
  async getMedicineById(id: string) {
    const medicine = await medicineRepository.findById(id);
    if (!medicine) {
      throw new AppError("Medicine not found in formulary", 404);
    }
    return medicine;
  }

  /**
   * Deletes a medicine from the formulary catalog (soft-delete).
   */
  async deleteMedicine(id: string) {
    const existing = await medicineRepository.findById(id);
    if (!existing) {
      throw new AppError("Medicine not found in formulary", 404);
    }
    return medicineRepository.softDelete(id);
  }

  /**
   * Checks for known drug-drug interactions among a list of medicine IDs.
   */
  async checkInteractions(medicineIds: string[]) {
    if (medicineIds.length < 2) {
      return []; // Interactions require at least two medicines
    }
    return medicineRepository.findInteractions(medicineIds);
  }

  /**
   * Checks if a patient has active allergies to any of the provided medicine IDs.
   */
  async checkPatientAllergies(patientId: string, medicineIds: string[]) {
    const patient = await patientRepository.findById(patientId);
    if (!patient) {
      throw new AppError("Patient not found", 404);
    }

    const patientAllergies = await medicineRepository.findPatientAllergies(patientId);
    
    // Filter patient allergies that match the incoming medicine IDs
    return patientAllergies.filter(allergy => medicineIds.includes(allergy.medicineId));
  }

  /**
   * Exposes active patient allergy chart profiles.
   */
  async getPatientAllergies(patientId: string) {
    const patient = await patientRepository.findById(patientId);
    if (!patient) {
      throw new AppError("Patient not found", 404);
    }
    return medicineRepository.findPatientAllergies(patientId);
  }

  /**
   * Appends an allergy marker to a patient chart.
   */
  async addPatientAllergy(patientId: string, data: {
    medicineId: string;
    severity: AllergySeverity;
    reaction?: string | null;
  }) {
    const patient = await patientRepository.findById(patientId);
    if (!patient) {
      throw new AppError("Patient not found", 404);
    }

    const medicine = await medicineRepository.findById(data.medicineId);
    if (!medicine) {
      throw new AppError("Medicine not found", 404);
    }

    // Check if allergy is already registered
    const existingAllergies = await medicineRepository.findPatientAllergies(patientId);
    const alreadyExists = existingAllergies.some(allergy => allergy.medicineId === data.medicineId);
    if (alreadyExists) {
      throw new AppError("This allergy is already recorded on the patient's chart", 400);
    }

    return medicineRepository.createPatientAllergy(patientId, data);
  }

  /**
   * Removes an allergy marker from a patient chart.
   */
  async removePatientAllergy(allergyId: string) {
    // Note: We can expand this check if needed.
    return medicineRepository.deletePatientAllergy(allergyId);
  }
}

export const pharmacySafetyService = new PharmacySafetyService();
