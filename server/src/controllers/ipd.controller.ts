import { Request, Response } from "express";
import { ipdWardService } from "../services/ipd-ward.service.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { AppError } from "../utils/AppError.js";

/**
 * Controller for managing IPD wards, beds, admissions, and vitals signs log charts.
 */
export const getWards = asyncHandler(async (req: Request, res: Response) => {
  const { branchId, page, limit } = req.query;

  const result = await ipdWardService.getWards({
    branchId: branchId ? String(branchId) : undefined,
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
  });

  res.status(200).json({
    success: true,
    data: result.data,
    pagination: result.pagination,
  });
});

export const createWard = asyncHandler(async (req: Request, res: Response) => {
  const { branchId, name, code, dailyTariffCode } = req.body;

  const ward = await ipdWardService.createWard({
    branchId,
    name,
    code,
    dailyTariffCode,
  });

  res.status(201).json({
    success: true,
    message: "Ward successfully configured",
    data: ward,
  });
});

export const createBed = asyncHandler(async (req: Request, res: Response) => {
  const { wardId, bedNumber } = req.body;

  const bed = await ipdWardService.createBed({
    wardId,
    bedNumber,
  });

  res.status(201).json({
    success: true,
    message: "Bed successfully created in ward",
    data: bed,
  });
});

export const admitPatient = asyncHandler(async (req: Request, res: Response) => {
  const { patientId, admittingDoctorId, bedId } = req.body;

  const admission = await ipdWardService.admitPatient({
    patientId,
    admittingDoctorId,
    bedId,
  });

  res.status(201).json({
    success: true,
    message: "Patient admission completed successfully",
    data: admission,
  });
});

export const getActiveAdmissions = asyncHandler(async (req: Request, res: Response) => {
  const { wardId, branchId, page, limit } = req.query;

  const result = await ipdWardService.getActiveAdmissions({
    wardId: wardId ? String(wardId) : undefined,
    branchId: branchId ? String(branchId) : undefined,
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
  });

  res.status(200).json({
    success: true,
    data: result.data,
    pagination: result.pagination,
  });
});

export const getAdmissionById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const admission = await ipdWardService.getAdmissionById(String(id));

  res.status(200).json({
    success: true,
    data: admission,
  });
});

export const transferPatient = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params; // Admission ID
  const { targetBedId } = req.body;

  const admission = await ipdWardService.transferPatient(String(id), String(targetBedId));

  res.status(200).json({
    success: true,
    message: "Patient transferred to target bed successfully",
    data: admission,
  });
});

export const dischargePatient = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params; // Admission ID
  const { dischargeNotes } = req.body;

  const admission = await ipdWardService.dischargePatient(String(id), dischargeNotes);

  res.status(200).json({
    success: true,
    message: "Patient discharge and billing clearance completed successfully",
    data: admission,
  });
});

export const logInpatientVitals = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError("Authentication required", 401);
  }

  const { id } = req.params; // Admission ID
  const { temperature, bloodPressure, heartRate, respiratoryRate, oxygenSaturation, notes } = req.body;

  const log = await ipdWardService.logVitals({
    admissionId: String(id),
    recordedById: req.user.id,
    temperature: temperature ? Number(temperature) : null,
    bloodPressure,
    heartRate: heartRate ? Number(heartRate) : null,
    respiratoryRate: respiratoryRate ? Number(respiratoryRate) : null,
    oxygenSaturation: oxygenSaturation ? Number(oxygenSaturation) : null,
    notes,
  });

  res.status(250).json({
    success: true,
    message: "Vitals log charted successfully",
    data: log,
  });
});

export const clearBedCleaning = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params; // Bed ID

  const bed = await ipdWardService.clearBedCleaning(String(id));

  res.status(200).json({
    success: true,
    message: "Bed has been successfully cleaned and marked available",
    data: bed,
  });
});
