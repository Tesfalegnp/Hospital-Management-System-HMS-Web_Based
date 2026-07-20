import { Request, Response } from "express";
import { inventoryService } from "../services/inventory.service.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { AppError } from "../utils/AppError.js";
import { InventoryTransactionType } from "@prisma/client";

/**
 * Controller for managing pharmacy inventory batches and stock logs.
 */
export const getBranchInventory = asyncHandler(async (req: Request, res: Response) => {
  const { branchId, search, categoryId, page, limit } = req.query;

  if (!branchId) {
    throw new AppError("Branch ID is required to fetch inventory", 400);
  }

  const result = await inventoryService.getBranchInventory({
    branchId: String(branchId),
    search: search ? String(search) : undefined,
    categoryId: categoryId ? String(categoryId) : undefined,
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
  });

  res.status(200).json({
    success: true,
    data: result.data,
    pagination: result.pagination,
  });
});

export const recordIntake = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError("Authentication required", 401);
  }

  const {
    medicineId,
    batchNumber,
    expiryDate,
    quantity,
    purchasePrice,
    sellingPrice,
    storageLocationId,
    branchId,
  } = req.body;

  const batch = await inventoryService.recordIntake({
    medicineId,
    batchNumber,
    expiryDate,
    quantity,
    purchasePrice,
    sellingPrice,
    storageLocationId,
    branchId,
    userId: req.user.id,
  });

  res.status(201).json({
    success: true,
    message: "Stock intake logged successfully",
    data: batch,
  });
});

export const adjustStock = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError("Authentication required", 401);
  }

  const { medicineBatchId, quantity, notes } = req.body;

  const batch = await inventoryService.adjustStock({
    medicineBatchId,
    quantity,
    notes,
    userId: req.user.id,
  });

  res.status(200).json({
    success: true,
    message: "Stock adjustment reconciliation recorded",
    data: batch,
  });
});

export const transferStock = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError("Authentication required", 401);
  }

  const { medicineBatchId, destinationBranchId, destinationStorageLocationId, quantity } = req.body;

  const result = await inventoryService.transferStock({
    medicineBatchId,
    destinationBranchId,
    destinationStorageLocationId,
    quantity,
    userId: req.user.id,
  });

  res.status(200).json({
    success: true,
    message: "Stock transfer complete",
    data: result,
  });
});

export const getSafetyReports = asyncHandler(async (req: Request, res: Response) => {
  const { branchId } = req.query;

  if (!branchId) {
    throw new AppError("Branch ID is required to compile safety reports", 400);
  }

  const report = await inventoryService.getSafetyReports(String(branchId));

  res.status(200).json({
    success: true,
    data: report,
  });
});

export const getLedgerLogs = asyncHandler(async (req: Request, res: Response) => {
  const { branchId, medicineBatchId, type, page, limit } = req.query;

  const result = await inventoryService.getLedgerLogs({
    branchId: branchId ? String(branchId) : undefined,
    medicineBatchId: medicineBatchId ? String(medicineBatchId) : undefined,
    type: type ? (String(type) as InventoryTransactionType) : undefined,
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
  });

  res.status(200).json({
    success: true,
    data: result.data,
    pagination: result.pagination,
  });
});
