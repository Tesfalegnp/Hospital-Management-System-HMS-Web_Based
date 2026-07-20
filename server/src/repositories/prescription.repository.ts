import prisma from "../database/prisma.js";
import { Prisma, Prescription, PrescriptionStatus, DispenseRecord } from "@prisma/client";
import { AppError } from "../utils/AppError.js";

export class PrescriptionRepository {
  /**
   * Create a new structured prescription with its items.
   */
  async createPrescription(data: {
    patientId: string;
    doctorId: string;
    encounterId?: string | null;
    notes?: string | null;
    items: {
      medicineId: string;
      quantity: number;
      dosageInstruction: string;
      routeId: string;
    }[];
  }) {
    return prisma.prescription.create({
      data: {
        patientId: data.patientId,
        doctorId: data.doctorId,
        encounterId: data.encounterId || null,
        notes: data.notes || null,
        items: {
          create: data.items.map((item) => ({
            medicineId: item.medicineId,
            quantity: item.quantity,
            dosageInstruction: item.dosageInstruction,
            routeId: item.routeId,
          })),
        },
      },
      include: {
        items: true,
      },
    });
  }

  /**
   * Find prescriptions queue with optional filters.
   */
  async findPrescriptions(filters: {
    status?: PrescriptionStatus;
    patientId?: string;
    page?: number;
    limit?: number;
  }) {
    const { status, patientId, page = 1, limit = 10 } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.PrescriptionWhereInput = {
      deletedAt: null,
    };

    if (status) {
      where.status = status;
    }

    if (patientId) {
      where.patientId = patientId;
    }

    const [items, total] = await Promise.all([
      prisma.prescription.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          patient: {
            include: { user: true },
          },
          doctor: {
            include: { user: true },
          },
          items: {
            include: {
              medicine: true,
              route: true,
            },
          },
        },
      }),
      prisma.prescription.count({ where }),
    ]);

    return {
      data: items,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Find a specific prescription by ID.
   */
  async findById(id: string) {
    return prisma.prescription.findFirst({
      where: { id, deletedAt: null },
      include: {
        patient: {
          include: { user: true },
        },
        doctor: {
          include: { user: true },
        },
        items: {
          include: {
            medicine: true,
            route: true,
          },
        },
        dispenses: {
          include: {
            pharmacist: true,
            witness: true,
            items: {
              include: {
                medicineBatch: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Execute prescription dispensing transaction.
   */
  async dispensePrescription(
    prescriptionId: string,
    data: {
      pharmacistId: string;
      witnessId?: string | null;
      notes?: string | null;
      items: {
        prescriptionItemId: string;
        medicineBatchId: string;
        quantityDispensed: number;
      }[];
    }
  ) {
    return prisma.$transaction(async (t) => {
      // 1. Create the base Dispense Record
      const dispenseRecord = await t.dispenseRecord.create({
        data: {
          prescriptionId,
          pharmacistId: data.pharmacistId,
          witnessId: data.witnessId || null,
          notes: data.notes || null,
        },
      });

      // 2. Loop through all dispense items to update balances & inventory
      for (const item of data.items) {
        // Fetch current prescription item to verify balance
        const rxItem = await t.prescriptionItem.findUnique({
          where: { id: item.prescriptionItemId },
          include: { medicine: true }
        });

        if (!rxItem) {
          throw new AppError("Prescribed medication item not found", 404);
        }

        const remaining = rxItem.quantity - rxItem.dispensedQuantity;
        if (item.quantityDispensed > remaining) {
          throw new AppError(
            `Dispense quantity (${item.quantityDispensed}) exceeds the remaining prescribed balance (${remaining}) for ${rxItem.medicine.brandName}`,
            400
          );
        }

        // Fetch medicine batch in stock
        const batch = await t.medicineBatch.findUnique({
          where: { id: item.medicineBatchId }
        });

        if (!batch || batch.deletedAt) {
          throw new AppError(`Medication batch not found in stock`, 404);
        }

        if (batch.quantity < item.quantityDispensed) {
          throw new AppError(
            `Insufficient stock in batch ${batch.batchNumber}. Available: ${batch.quantity}, Dispensing: ${item.quantityDispensed}`,
            400
          );
        }

        // Deduct physical inventory batch stock
        await t.medicineBatch.update({
          where: { id: item.medicineBatchId },
          data: { quantity: { decrement: item.quantityDispensed } }
        });

        // Record stock dispense in the inventory logs ledger
        await t.inventoryTransaction.create({
          data: {
            medicineBatchId: item.medicineBatchId,
            type: "STOCK_DISPENSE",
            quantity: -item.quantityDispensed,
            userId: data.pharmacistId,
            referenceId: dispenseRecord.id,
            notes: `Dispensed for prescription ID: ${prescriptionId}`
          }
        });

        // Update prescription item's dispensed balance
        await t.prescriptionItem.update({
          where: { id: item.prescriptionItemId },
          data: { dispensedQuantity: { increment: item.quantityDispensed } }
        });

        // Create dispense item link
        await t.dispenseItem.create({
          data: {
            dispenseRecordId: dispenseRecord.id,
            prescriptionItemId: item.prescriptionItemId,
            medicineBatchId: item.medicineBatchId,
            quantityDispensed: item.quantityDispensed,
          }
        });
      }

      // 3. Re-evaluate overall prescription status
      const allRxItems = await t.prescriptionItem.findMany({
        where: { prescriptionId }
      });

      let allFullyDispensed = true;
      let anyDispensed = false;

      allRxItems.forEach((item) => {
        if (item.dispensedQuantity < item.quantity) {
          allFullyDispensed = false;
        }
        if (item.dispensedQuantity > 0) {
          anyDispensed = true;
        }
      });

      let nextStatus: PrescriptionStatus = "PENDING";
      if (allFullyDispensed) {
        nextStatus = "DISPENSED";
      } else if (anyDispensed) {
        nextStatus = "PARTIALLY_DISPENSED";
      }

      await t.prescription.update({
        where: { id: prescriptionId },
        data: { status: nextStatus }
      });

      return t.dispenseRecord.findUnique({
        where: { id: dispenseRecord.id },
        include: {
          pharmacist: true,
          witness: true,
          items: {
            include: {
              prescriptionItem: {
                include: { medicine: true }
              },
              medicineBatch: true
            }
          }
        }
      });
    });
  }
}

export const prescriptionRepository = new PrescriptionRepository();
