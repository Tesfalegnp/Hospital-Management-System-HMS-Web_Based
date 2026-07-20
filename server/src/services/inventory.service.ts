import { inventoryRepository } from "../repositories/inventory.repository.js";
import { AppError } from "../utils/AppError.js";
import { InventoryTransactionType } from "@prisma/client";

export class InventoryService {
  /**
   * Records stock intake after ensuring the batch has not already expired.
   */
  async recordIntake(data: {
    medicineId: string;
    batchNumber: string;
    expiryDate: string; // ISO String
    quantity: number;
    purchasePrice: number;
    sellingPrice: number;
    storageLocationId?: string | null;
    branchId: string;
    userId: string;
  }) {
    const expiry = new Date(data.expiryDate);
    const now = new Date();

    if (expiry <= now) {
      throw new AppError("Cannot record intake of medications that have already expired", 400);
    }

    return inventoryRepository.recordIntake({
      ...data,
      expiryDate: expiry
    });
  }

  /**
   * Adjusts stock quantity for damage, loss, or count audit reconciliation.
   */
  async adjustStock(data: {
    medicineBatchId: string;
    quantity: number;
    userId: string;
    notes: string;
  }) {
    return inventoryRepository.recordAdjustment(data);
  }

  /**
   * Registers transfers of stock between branches.
   */
  async transferStock(data: {
    medicineBatchId: string;
    destinationBranchId: string;
    destinationStorageLocationId?: string | null;
    quantity: number;
    userId: string;
  }) {
    const sourceBatch = await inventoryRepository.findById(data.medicineBatchId);
    if (!sourceBatch) {
      throw new AppError("Source batch not found", 404);
    }

    if (sourceBatch.branchId === data.destinationBranchId) {
      throw new AppError("Source and destination branches must be different for a transfer", 400);
    }

    return inventoryRepository.recordTransfer(data);
  }

  /**
   * Fetch current inventory batches.
   */
  async getBranchInventory(filters: {
    branchId: string;
    search?: string;
    categoryId?: string;
    page?: number;
    limit?: number;
  }) {
    return inventoryRepository.findBatches(filters);
  }

  /**
   * Fetch ledger logs for auditing.
   */
  async getLedgerLogs(filters: {
    branchId?: string;
    medicineBatchId?: string;
    type?: InventoryTransactionType;
    page?: number;
    limit?: number;
  }) {
    return inventoryRepository.findTransactions(filters);
  }

  /**
   * Generates safety reports summarizing expired, near-expiry, and low stock warnings.
   */
  async getSafetyReports(branchId: string) {
    // We can fetch up to 100 batches in the branch to check their safety status
    const result = await inventoryRepository.findBatches({
      branchId,
      limit: 100
    });

    const now = new Date();
    const nearExpiryCutoff = new Date();
    nearExpiryCutoff.setDate(now.getDate() + 90); // 90 days warning

    const expired: any[] = [];
    const nearExpiry: any[] = [];
    const lowStock: any[] = [];

    result.data.forEach((batch) => {
      const expiry = new Date(batch.expiryDate);
      
      if (expiry <= now) {
        expired.push(batch);
      } else if (expiry <= nearExpiryCutoff) {
        nearExpiry.push(batch);
      }

      if (batch.quantity <= batch.reorderLevel) {
        lowStock.push(batch);
      }
    });

    return {
      expiredCount: expired.length,
      nearExpiryCount: nearExpiry.length,
      lowStockCount: lowStock.length,
      expiredList: expired.slice(0, 10), // cap preview lists
      nearExpiryList: nearExpiry.slice(0, 10),
      lowStockList: lowStock.slice(0, 10)
    };
  }
}

export const inventoryService = new InventoryService();
