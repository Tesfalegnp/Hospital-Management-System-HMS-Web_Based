import prisma from "../database/prisma.js";
import { Prisma, MedicineBatch, InventoryTransaction, InventoryTransactionType } from "@prisma/client";
import { AppError } from "../utils/AppError.js";

export class InventoryRepository {
  /**
   * Find a specific batch by its ID, including details.
   */
  async findById(id: string) {
    return prisma.medicineBatch.findFirst({
      where: { id, deletedAt: null },
      include: {
        medicine: {
          include: { category: true, manufacturer: true }
        },
        storageLocation: true,
        branch: true
      }
    });
  }

  /**
   * Find a specific batch by unique branch, medicine, and batch number.
   */
  async findByUniqueKey(branchId: string, medicineId: string, batchNumber: string) {
    return prisma.medicineBatch.findUnique({
      where: {
        branchId_medicineId_batchNumber: {
          branchId,
          medicineId,
          batchNumber
        }
      },
      include: {
        medicine: true
      }
    });
  }

  /**
   * Fetch paginated list of batches inside a branch with optional search and category filters.
   */
  async findBatches(filters: {
    branchId: string;
    search?: string;
    categoryId?: string;
    page?: number;
    limit?: number;
  }) {
    const { branchId, search, categoryId, page = 1, limit = 10 } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.MedicineBatchWhereInput = {
      branchId,
      deletedAt: null
    };

    const medicineWhere: Prisma.MedicineWhereInput = {
      deletedAt: null
    };

    if (categoryId) {
      medicineWhere.categoryId = categoryId;
    }

    if (search) {
      medicineWhere.OR = [
        { brandName: { contains: search, mode: "insensitive" } },
        { genericName: { contains: search, mode: "insensitive" } }
      ];
    }

    if (categoryId || search) {
      where.medicine = medicineWhere;
    }

    const [items, total] = await Promise.all([
      prisma.medicineBatch.findMany({
        where,
        skip,
        take: limit,
        orderBy: { expiryDate: "asc" },
        include: {
          medicine: {
            include: { category: true, manufacturer: true }
          },
          storageLocation: true
        }
      }),
      prisma.medicineBatch.count({ where })
    ]);

    return {
      data: items,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Record stock intake in a Prisma transaction (upsert batch + log transaction).
   */
  async recordIntake(data: {
    medicineId: string;
    batchNumber: string;
    expiryDate: Date;
    quantity: number;
    purchasePrice: number;
    sellingPrice: number;
    storageLocationId?: string | null;
    branchId: string;
    userId: string;
  }) {
    return prisma.$transaction(async (t) => {
      // Upsert physical stock batch record
      const batch = await t.medicineBatch.upsert({
        where: {
          branchId_medicineId_batchNumber: {
            branchId: data.branchId,
            medicineId: data.medicineId,
            batchNumber: data.batchNumber
          }
        },
        create: {
          medicineId: data.medicineId,
          batchNumber: data.batchNumber,
          expiryDate: data.expiryDate,
          quantity: data.quantity,
          purchasePrice: data.purchasePrice,
          sellingPrice: data.sellingPrice,
          storageLocationId: data.storageLocationId,
          branchId: data.branchId
        },
        update: {
          quantity: { increment: data.quantity },
          purchasePrice: data.purchasePrice,
          sellingPrice: data.sellingPrice,
          expiryDate: data.expiryDate,
          deletedAt: null // reset soft delete if previously deleted
        }
      });

      // Log append-only transaction ledger log
      await t.inventoryTransaction.create({
        data: {
          medicineBatchId: batch.id,
          type: "STOCK_INTAKE",
          quantity: data.quantity,
          userId: data.userId,
          notes: `Intake delivery logged. Cost: ${data.purchasePrice}, Sell: ${data.sellingPrice}`
        }
      });

      return batch;
    });
  }

  /**
   * Process manual stock adjustments (reconciliation, damage, loss).
   */
  async recordAdjustment(data: {
    medicineBatchId: string;
    quantity: number; // can be negative for deduction
    userId: string;
    notes: string;
  }) {
    return prisma.$transaction(async (t) => {
      const batch = await t.medicineBatch.findUnique({
        where: { id: data.medicineBatchId }
      });

      if (!batch || batch.deletedAt) {
        throw new AppError("Medicine batch not found", 404);
      }

      const newQuantity = batch.quantity + data.quantity;
      if (newQuantity < 0) {
        throw new AppError(`Insufficient stock batch quantity. Available: ${batch.quantity}, requested adjustment: ${data.quantity}`, 400);
      }

      const updatedBatch = await t.medicineBatch.update({
        where: { id: data.medicineBatchId },
        data: { quantity: newQuantity }
      });

      await t.inventoryTransaction.create({
        data: {
          medicineBatchId: data.medicineBatchId,
          type: "STOCK_ADJUSTMENT",
          quantity: data.quantity,
          userId: data.userId,
          notes: data.notes
        }
      });

      return updatedBatch;
    });
  }

  /**
   * Transfer stock between different branches inside a safe transaction.
   */
  async recordTransfer(data: {
    medicineBatchId: string;
    destinationBranchId: string;
    destinationStorageLocationId?: string | null;
    quantity: number;
    userId: string;
  }) {
    return prisma.$transaction(async (t) => {
      // Find source batch
      const sourceBatch = await t.medicineBatch.findUnique({
        where: { id: data.medicineBatchId },
        include: { medicine: true }
      });

      if (!sourceBatch || sourceBatch.deletedAt) {
        throw new AppError("Source medicine batch not found", 404);
      }

      if (sourceBatch.quantity < data.quantity) {
        throw new AppError(`Insufficient stock for transfer. Available: ${sourceBatch.quantity}, Transfer Quantity: ${data.quantity}`, 400);
      }

      // Deduct from source batch
      const updatedSourceBatch = await t.medicineBatch.update({
        where: { id: data.medicineBatchId },
        data: { quantity: { decrement: data.quantity } }
      });

      // Upsert at destination branch
      const destBatch = await t.medicineBatch.upsert({
        where: {
          branchId_medicineId_batchNumber: {
            branchId: data.destinationBranchId,
            medicineId: sourceBatch.medicineId,
            batchNumber: sourceBatch.batchNumber
          }
        },
        create: {
          medicineId: sourceBatch.medicineId,
          batchNumber: sourceBatch.batchNumber,
          expiryDate: sourceBatch.expiryDate,
          quantity: data.quantity,
          purchasePrice: sourceBatch.purchasePrice,
          sellingPrice: sourceBatch.sellingPrice,
          storageLocationId: data.destinationStorageLocationId || null,
          branchId: data.destinationBranchId
        },
        update: {
          quantity: { increment: data.quantity },
          deletedAt: null
        }
      });

      // Log deduction on source batch
      await t.inventoryTransaction.create({
        data: {
          medicineBatchId: sourceBatch.id,
          type: "STOCK_TRANSFER",
          quantity: -data.quantity,
          userId: data.userId,
          notes: `Transferred to branch: ${data.destinationBranchId}`
        }
      });

      // Log addition on destination batch
      await t.inventoryTransaction.create({
        data: {
          medicineBatchId: destBatch.id,
          type: "STOCK_TRANSFER",
          quantity: data.quantity,
          userId: data.userId,
          notes: `Transferred from branch: ${sourceBatch.branchId}`
        }
      });

      return {
        sourceBatch: updatedSourceBatch,
        destinationBatch: destBatch
      };
    });
  }

  /**
   * Fetch audit logs transaction records for auditing.
   */
  async findTransactions(filters: {
    branchId?: string;
    medicineBatchId?: string;
    type?: InventoryTransactionType;
    page?: number;
    limit?: number;
  }) {
    const { branchId, medicineBatchId, type, page = 1, limit = 10 } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.InventoryTransactionWhereInput = {};

    if (type) {
      where.type = type;
    }

    if (medicineBatchId) {
      where.medicineBatchId = medicineBatchId;
    }

    if (branchId) {
      where.medicineBatch = { branchId };
    }

    const [items, total] = await Promise.all([
      prisma.inventoryTransaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          medicineBatch: {
            include: {
              medicine: true
            }
          },
          user: true
        }
      }),
      prisma.inventoryTransaction.count({ where })
    ]);

    return {
      data: items,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
  }
}

export const inventoryRepository = new InventoryRepository();
