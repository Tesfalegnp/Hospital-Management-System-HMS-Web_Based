import { Request, Response } from "express";
import { consultationService } from "../services/consultation.service.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

/**
 * Controller for managing clinical consultation encounters.
 */
export const recordEncounter = asyncHandler(async (req: Request, res: Response) => {
  const consultation = await consultationService.recordEncounter({
    patientId: req.body.patientId as string,
    doctorId: req.body.doctorId as string,
    branchId: req.body.branchId as string,
    appointmentId: (req.body.appointmentId as string) || undefined,
    bloodPressure: (req.body.bloodPressure as string) || undefined,
    heartRate: req.body.heartRate !== undefined ? Number(req.body.heartRate) : undefined,
    temperature: req.body.temperature !== undefined ? (req.body.temperature as string | number) : undefined,
    respiratoryRate: req.body.respiratoryRate !== undefined ? Number(req.body.respiratoryRate) : undefined,
    weight: req.body.weight !== undefined ? (req.body.weight as string | number) : undefined,
    chiefComplaint: (req.body.chiefComplaint as string) || undefined,
    physicalExamination: (req.body.physicalExamination as string) || undefined,
    diagnosis: (req.body.diagnosis as string) || undefined,
    treatmentPlan: (req.body.treatmentPlan as string) || undefined,
  });

  res.status(201).json({
    success: true,
    message: "Clinical encounter recorded successfully",
    data: consultation,
  });
});

export const updateEncounter = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  
  const consultation = await consultationService.updateEncounter(id, {
    bloodPressure: (req.body.bloodPressure as string) || undefined,
    heartRate: req.body.heartRate !== undefined ? Number(req.body.heartRate) : undefined,
    temperature: req.body.temperature !== undefined ? (req.body.temperature as string | number) : undefined,
    respiratoryRate: req.body.respiratoryRate !== undefined ? Number(req.body.respiratoryRate) : undefined,
    weight: req.body.weight !== undefined ? (req.body.weight as string | number) : undefined,
    chiefComplaint: (req.body.chiefComplaint as string) || undefined,
    physicalExamination: (req.body.physicalExamination as string) || undefined,
    diagnosis: (req.body.diagnosis as string) || undefined,
    treatmentPlan: (req.body.treatmentPlan as string) || undefined,
  });

  res.status(200).json({
    success: true,
    message: "Consultation updated successfully",
    data: consultation,
  });
});

export const getPatientHistory = asyncHandler(async (req: Request, res: Response) => {
  const patientId = req.params.patientId as string;

  const history = await consultationService.getPatientHistory(patientId);

  res.status(200).json({
    success: true,
    message: "Patient consultation history retrieved successfully",
    data: history,
  });
});
