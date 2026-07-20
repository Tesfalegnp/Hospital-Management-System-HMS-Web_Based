import prisma from "../database/prisma.js";
import { Prisma, Medicine, PatientAllergy, AllergySeverity } from "@prisma/client";

export class MedicineRepository {
  /**
   * Creates a new medicine entry, approved routes, and optional interactions in a transaction.
   */
  async create(data: {
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
  }, tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    return client.medicine.create({
      data: {
        brandName: data.brandName,
        genericName: data.genericName,
        sku: data.sku,
        strength: data.strength,
        description: data.description,
        manufacturerId: data.manufacturerId,
        categoryId: data.categoryId,
        dosageFormId: data.dosageFormId,
        storageLocationId: data.storageLocationId,
        approvedRoutes: {
          create: data.approvedRouteIds.map(routeId => ({
            routeId
          }))
        },
        interactionsA: {
          create: data.interactions?.map(interaction => ({
            medicineBId: interaction.medicineBId,
            severity: interaction.severity,
            description: interaction.description
          })) || []
        }
      },
      include: {
        manufacturer: true,
        category: true,
        dosageForm: true,
        storageLocation: true,
        approvedRoutes: {
          include: { route: true }
        },
        interactionsA: {
          include: { medicineB: true }
        },
        interactionsB: {
          include: { medicineA: true }
        }
      }
    });
  }

  /**
   * Updates an existing medicine entry. Relational changes (routes/interactions) are updated.
   */
  async update(id: string, data: {
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
  }, tx?: Prisma.TransactionClient) {
    const runUpdate = async (t: Prisma.TransactionClient) => {
      if (data.approvedRouteIds) {
        // Clear existing approved routes
        await t.approvedRoute.deleteMany({ where: { medicineId: id } });
      }

      if (data.interactions) {
        // Clear existing interactions where this medicine is A
        await t.drugInteraction.deleteMany({ where: { medicineAId: id } });
      }

      return t.medicine.update({
        where: { id },
        data: {
          brandName: data.brandName,
          genericName: data.genericName,
          sku: data.sku,
          strength: data.strength,
          description: data.description,
          manufacturerId: data.manufacturerId,
          categoryId: data.categoryId,
          dosageFormId: data.dosageFormId,
          storageLocationId: data.storageLocationId,
          approvedRoutes: data.approvedRouteIds ? {
            create: data.approvedRouteIds.map(routeId => ({
              routeId
            }))
          } : undefined,
          interactionsA: data.interactions ? {
            create: data.interactions.map(interaction => ({
              medicineBId: interaction.medicineBId,
              severity: interaction.severity,
              description: interaction.description
            }))
          } : undefined
        },
        include: {
          manufacturer: true,
          category: true,
          dosageForm: true,
          storageLocation: true,
          approvedRoutes: {
            include: { route: true }
          },
          interactionsA: {
            include: { medicineB: true }
          },
          interactionsB: {
            include: { medicineA: true }
          }
        }
      });
    };

    if (tx) {
      return runUpdate(tx);
    } else {
      return prisma.$transaction(async (t) => {
        return runUpdate(t);
      });
    }
  }

  /**
   * Finds a medicine by its unique ID.
   */
  async findById(id: string) {
    return prisma.medicine.findFirst({
      where: { id, deletedAt: null },
      include: {
        manufacturer: true,
        category: true,
        dosageForm: true,
        storageLocation: true,
        approvedRoutes: {
          include: { route: true }
        },
        interactionsA: {
          include: { medicineB: true }
        },
        interactionsB: {
          include: { medicineA: true }
        }
      }
    });
  }

  /**
   * Fetches paginated medicines with optional search and lookup filters.
   */
  async findMany(filters: {
    search?: string;
    categoryId?: string;
    manufacturerId?: string;
    page?: number;
    limit?: number;
  }) {
    const { search, categoryId, manufacturerId, page = 1, limit = 10 } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.MedicineWhereInput = {
      deletedAt: null,
      isActive: true
    };

    if (search) {
      where.OR = [
        { brandName: { contains: search, mode: "insensitive" } },
        { genericName: { contains: search, mode: "insensitive" } }
      ];
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (manufacturerId) {
      where.manufacturerId = manufacturerId;
    }

    const [items, total] = await Promise.all([
      prisma.medicine.findMany({
        where,
        skip,
        take: limit,
        orderBy: { brandName: "asc" },
        include: {
          manufacturer: true,
          category: true,
          dosageForm: true,
          storageLocation: true,
          approvedRoutes: {
            include: { route: true }
          }
        }
      }),
      prisma.medicine.count({ where })
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
   * Performs soft deletion of a medicine.
   */
  async softDelete(id: string): Promise<Medicine> {
    return prisma.medicine.update({
      where: { id },
      data: { deletedAt: new Date() }
    });
  }

  /**
   * Checks pairwise drug interactions between a list of medicine IDs.
   */
  async findInteractions(medicineIds: string[]) {
    return prisma.drugInteraction.findMany({
      where: {
        deletedAt: null,
        medicineAId: { in: medicineIds },
        medicineBId: { in: medicineIds }
      },
      include: {
        medicineA: true,
        medicineB: true
      }
    });
  }

  /**
   * Exposes patient allergies history.
   */
  async findPatientAllergies(patientId: string): Promise<PatientAllergy[]> {
    return prisma.patientAllergy.findMany({
      where: { patientId, deletedAt: null },
      include: {
        medicine: true
      }
    });
  }

  /**
   * Adds an allergy record to a patient.
   */
  async createPatientAllergy(patientId: string, data: {
    medicineId: string;
    severity: AllergySeverity;
    reaction?: string | null;
  }): Promise<PatientAllergy> {
    return prisma.patientAllergy.create({
      data: {
        patientId,
        medicineId: data.medicineId,
        severity: data.severity,
        reaction: data.reaction
      },
      include: {
        medicine: true
      }
    });
  }

  /**
   * Soft-deletes a patient allergy.
   */
  async deletePatientAllergy(id: string): Promise<PatientAllergy> {
    return prisma.patientAllergy.update({
      where: { id },
      data: { deletedAt: new Date() }
    });
  }
}

export const medicineRepository = new MedicineRepository();
