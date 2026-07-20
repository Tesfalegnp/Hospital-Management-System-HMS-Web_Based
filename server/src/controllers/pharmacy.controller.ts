import { Request, Response } from "express";
import { pharmacySafetyService } from "../services/pharmacy-safety.service.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { AppError } from "../utils/AppError.js";

/**
 * Controller for managing the Pharmacy Formulary and Clinical Safety checks.
 */
export const getMedicines = asyncHandler(async (req: Request, res: Response) => {
  const { search, categoryId, manufacturerId, page, limit } = req.query;

  const result = await pharmacySafetyService.getMedicines({
    search: search ? String(search) : undefined,
    categoryId: categoryId ? String(categoryId) : undefined,
    manufacturerId: manufacturerId ? String(manufacturerId) : undefined,
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
  });

  res.status(200).json({
    success: true,
    data: result.data,
    pagination: result.pagination,
  });
});

export const getMedicineById = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const medicine = await pharmacySafetyService.getMedicineById(id);

  res.status(200).json({
    success: true,
    data: medicine,
  });
});

export const createMedicine = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError("Authentication required", 401);
  }

  const {
    brandName,
    genericName,
    sku,
    strength,
    description,
    manufacturerId,
    categoryId,
    dosageFormId,
    storageLocationId,
    approvedRouteIds,
    interactions,
  } = req.body;

  const medicine = await pharmacySafetyService.createMedicine({
    brandName,
    genericName,
    sku,
    strength,
    description,
    manufacturerId,
    categoryId,
    dosageFormId,
    storageLocationId,
    approvedRouteIds,
    interactions,
  });

  res.status(201).json({
    success: true,
    message: "Medicine added to formulary successfully",
    data: medicine,
  });
});

export const checkInteractions = asyncHandler(async (req: Request, res: Response) => {
  const { medicineIds } = req.body;

  const interactions = await pharmacySafetyService.checkInteractions(medicineIds);

  res.status(200).json({
    success: true,
    data: interactions,
  });
});
