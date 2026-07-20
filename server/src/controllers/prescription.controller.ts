import { Request, Response } from "express";
import { prescriptionDispenseService } from "../services/prescription-dispense.service.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { AppError } from "../utils/AppError.js";
import { PrescriptionStatus } from "@prisma/client";

/**
 * Controller for structured prescribing and dispensing.
 */
export const createPrescription = asyncHandler(async (req: Request, res: Response) => {
  const { patientId, doctorId, encounterId, notes, items } = req.body;

  const prescription = await prescriptionDispenseService.createPrescription({
    patientId,
    doctorId,
    encounterId,
    notes,
    items,
  });

  res.status(201).json({
    success: true,
    message: "Structured prescription recorded and queued in pharmacy",
    data: prescription,
  });
});

export const getPrescriptionQueue = asyncHandler(async (req: Request, res: Response) => {
  const { status, patientId, page, limit } = req.query;

  const result = await prescriptionDispenseService.getPrescriptionQueue({
    status: status ? (String(status) as PrescriptionStatus) : undefined,
    patientId: patientId ? String(patientId) : undefined,
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
  });

  res.status(200).json({
    success: true,
    data: result.data,
    pagination: result.pagination,
  });
});

export const getPrescriptionById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const prescription = await prescriptionDispenseService.getPrescriptionById(String(id));

  res.status(200).json({
    success: true,
    data: prescription,
  });
});

export const dispensePrescription = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError("Authentication required", 401);
  }

  const { id } = req.params;
  const { items, witnessId, notes } = req.body;

  const record = await prescriptionDispenseService.dispensePrescription(String(id), {
    pharmacistId: req.user.id,
    witnessId,
    notes,
    items,
  });

  res.status(200).json({
    success: true,
    message: "Medications successfully dispensed, inventory updated",
    data: record,
  });
});
