import prisma from "../database/prisma.js";
import { Prisma, LabOrder, LabResult, LabTestCatalog, LabOrderStatus } from "@prisma/client";
import { AppError } from "../utils/AppError.js";

export class LabRepository {
  /**
   * Register a new diagnostic test definition.
   */
  async createCatalogItem(data: {
    branchId: string;
    name: string;
    code: string;
    category: string;
    price: number;
    normalRangeMin?: number | null;
    normalRangeMax?: number | null;
    unit?: string | null;
  }): Promise<LabTestCatalog> {
    return prisma.labTestCatalog.create({
      data: {
        branchId: data.branchId,
        name: data.name,
        code: data.code,
        category: data.category,
        price: data.price,
        normalRangeMin: data.normalRangeMin || null,
        normalRangeMax: data.normalRangeMax || null,
        unit: data.unit || null,
      },
    });
  }

  /**
   * Fetch active catalog definitions list.
   */
  async findCatalogItems(filters: {
    branchId?: string;
    category?: string;
    page?: number;
    limit?: number;
  }) {
    const { branchId, category, page = 1, limit = 10 } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.LabTestCatalogWhereInput = { deletedAt: null };

    if (branchId) {
      where.branchId = branchId;
    }
    if (category) {
      where.category = category;
    }

    const [items, total] = await Promise.all([
      prisma.labTestCatalog.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ category: "asc" }, { code: "asc" }],
      }),
      prisma.labTestCatalog.count({ where }),
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
   * Find specific catalog by ID.
   */
  async findCatalogById(id: string) {
    return prisma.labTestCatalog.findFirst({
      where: { id, deletedAt: null },
    });
  }

  /**
   * Places a new laboratory order and auto-bills the patient if linked to catalog.
   */
  async createOrder(data: {
    encounterId: string;
    patientId: string;
    orderedById: string;
    labTestCatalogId?: string | null;
    testName: string;
    clinicalNotes?: string | null;
  }): Promise<LabOrder> {
    return prisma.$transaction(async (tx) => {
      // 1. Create the LabOrder
      const order = await tx.labOrder.create({
        data: {
          encounterId: data.encounterId,
          patientId: data.patientId,
          orderedById: data.orderedById,
          labTestCatalogId: data.labTestCatalogId || null,
          testName: data.testName,
          clinicalNotes: data.clinicalNotes || null,
          status: "PENDING",
        },
      });

      // 2. If catalog item linked, auto-charge patient's invoice
      if (data.labTestCatalogId) {
        const catalog = await tx.labTestCatalog.findUnique({
          where: { id: data.labTestCatalogId },
        });

        if (catalog) {
          // Find or create pending/partially paid invoice
          let invoice = await tx.invoice.findFirst({
            where: {
              patientId: data.patientId,
              branchId: catalog.branchId,
              status: { in: ["PENDING", "PARTIALLY_PAID"] },
            },
          });

          if (!invoice) {
            invoice = await tx.invoice.create({
              data: {
                patientId: data.patientId,
                branchId: catalog.branchId,
                status: "PENDING",
                totalAmount: 0,
                paidAmount: 0,
              },
            });
          }

          // Create invoice line item
          await tx.invoiceItem.create({
            data: {
              invoiceId: invoice.id,
              name: `Diagnostic Fee: ${catalog.name}`,
              quantity: 1,
              unitPrice: catalog.price,
              totalPrice: catalog.price,
              labOrderId: order.id,
            },
          });

          // Update invoice total
          await tx.invoice.update({
            where: { id: invoice.id },
            data: {
              totalAmount: Number(invoice.totalAmount) + Number(catalog.price),
            },
          });
        }
      }

      return order;
    });
  }

  /**
   * Finds a LabOrder by ID.
   */
  async findOrderById(id: string) {
    return prisma.labOrder.findUnique({
      where: { id },
      include: {
        results: {
          include: {
            performingTechnician: true,
            approvingPathologist: true,
          },
        },
        labTestCatalog: true,
        patient: {
          include: { user: true },
        },
        orderedBy: {
          include: { user: true },
        },
      },
    });
  }

  /**
   * Retrieves pending lab work queue.
   */
  async getPendingOrders(filters?: { branchId?: string }): Promise<LabOrder[]> {
    const where: Prisma.LabOrderWhereInput = {
      status: {
        in: ["PENDING", "SPECIMEN_COLLECTED", "PROCESSING"],
      },
    };

    if (filters?.branchId) {
      where.labTestCatalog = { branchId: filters.branchId };
    }

    return prisma.labOrder.findMany({
      where,
      orderBy: {
        createdAt: "asc",
      },
      include: {
        patient: {
          include: { user: true },
        },
        orderedBy: {
          include: { user: true },
        },
        labTestCatalog: true,
        results: true,
      },
    });
  }

  /**
   * Retrieves diagnostic histories for a patient.
   */
  async getPatientLabHistory(patientId: string): Promise<(LabOrder & { results: LabResult | null })[]> {
    return prisma.labOrder.findMany({
      where: {
        patientId,
      },
      include: {
        results: {
          include: {
            performingTechnician: true,
            approvingPathologist: true,
          },
        },
        labTestCatalog: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  /**
   * Acknowledge specimen collection milestone.
   */
  async logSpecimenCollected(orderId: string, collectorId: string): Promise<LabOrder> {
    return prisma.labOrder.update({
      where: { id: orderId },
      data: {
        status: "SPECIMEN_COLLECTED",
        specimenCollectedAt: new Date(),
        specimenCollectedById: collectorId,
      },
    });
  }

  /**
   * Log technician results entry and shift status to PROCESSING.
   */
  async saveResultEntry(
    orderId: string,
    resultsData: { findings: string; value?: number | null; isAbnormal?: boolean | null; quantitativeData?: any },
    techId: string
  ): Promise<{ order: LabOrder; result: LabResult }> {
    return prisma.$transaction(async (tx) => {
      // 1. Create or update the LabResult
      const result = await tx.labResult.upsert({
        where: { labOrderId: orderId },
        create: {
          labOrderId: orderId,
          findings: resultsData.findings,
          value: resultsData.value || null,
          isAbnormal: resultsData.isAbnormal || false,
          quantitativeData: resultsData.quantitativeData || undefined,
          performingTechnicianId: techId,
        },
        update: {
          findings: resultsData.findings,
          value: resultsData.value || null,
          isAbnormal: resultsData.isAbnormal || false,
          quantitativeData: resultsData.quantitativeData || undefined,
          performingTechnicianId: techId,
          recordedAt: new Date(),
        },
      });

      // 2. Set Order to PROCESSING
      const order = await tx.labOrder.update({
        where: { id: orderId },
        data: {
          status: "PROCESSING",
        },
      });

      return { order, result };
    });
  }

  /**
   * Pathologist signs off, validation sets status to COMPLETED.
   */
  async validateAndCompleteResult(
    orderId: string,
    pathologistId: string
  ): Promise<{ order: LabOrder; result: LabResult }> {
    return prisma.$transaction(async (tx) => {
      // 1. Update LabResult validator references
      const result = await tx.labResult.update({
        where: { labOrderId: orderId },
        data: {
          approvingPathologistId: pathologistId,
          validatedAt: new Date(),
        },
      });

      // 2. Complete the Order
      const order = await tx.labOrder.update({
        where: { id: orderId },
        data: {
          status: "COMPLETED",
          fulfilledById: pathologistId,
        },
      });

      return { order, result };
    });
  }

  /**
   * Cancel lab order and remove/void corresponding invoice charges.
   */
  async cancelOrder(orderId: string): Promise<LabOrder> {
    return prisma.$transaction(async (tx) => {
      // 1. Set status to CANCELLED
      const order = await tx.labOrder.update({
        where: { id: orderId },
        data: { status: "CANCELLED" },
      });

      // 2. Void invoice charge
      const invItem = await tx.invoiceItem.findFirst({
        where: { labOrderId: orderId },
      });

      if (invItem) {
        // Deduct price from invoice
        await tx.invoice.update({
          where: { id: invItem.invoiceId },
          data: {
            totalAmount: { decrement: invItem.totalPrice },
          },
        });

        // Delete line item
        await tx.invoiceItem.delete({
          where: { id: invItem.id },
        });
      }

      return order;
    });
  }
}

export const labRepository = new LabRepository();
