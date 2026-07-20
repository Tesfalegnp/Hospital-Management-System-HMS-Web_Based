import { Request, Response } from "express";
import { pharmacySafetyService } from "../services/pharmacy-safety.service.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { AppError } from "../utils/AppError.js";

/**
 * Controller for managing patient allergies on their clinical charts.
 */
export const getPatientAllergies = asyncHandler(async (req: Request, res: Response) => {
  const patientId = req.params.patientId as string;
  const allergies = await pharmacySafetyService.getPatientAllergies(patientId);

  res.status(200).json({
    success: true,
    data: allergies,
  });
});

export const addPatientAllergy = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError("Authentication required", 401);
  }

  const patientId = req.params.patientId as string;
  const { medicineId, severity, reaction } = req.body;

  const allergy = await pharmacySafetyService.addPatientAllergy(patientId, {
    medicineId,
    severity,
    reaction,
  });

  res.status(201).json({
    success: true,
    message: "Patient allergy logged successfully",
    data: allergy,
  });
});

export const checkPatientAllergies = asyncHandler(async (req: Request, res: Response) => {
  const patientId = req.params.patientId as string;
  const { medicineIds } = req.body; // array of medicine ids

  if (!medicineIds || !Array.isArray(medicineIds)) {
    throw new AppError("medicineIds must be an array", 400);
  }

  const matchingAllergies = await pharmacySafetyService.checkPatientAllergies(patientId, medicineIds);

  res.status(200).json({
    success: true,
    data: matchingAllergies,
  });
});
