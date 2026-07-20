import prisma from "../database/prisma.js";
import { labRepository } from "../repositories/lab.repository.js";
import { AppError } from "../utils/AppError.js";
import { LabOrder, LabResult, LabTestCatalog, LabOrderStatus } from "@prisma/client";

export class LabService {
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
    const branch = await prisma.branch.findUnique({ where: { id: data.branchId } });
    if (!branch || branch.deletedAt) {
      throw new AppError("Branch clinic not found", 404);
    }
    return labRepository.createCatalogItem(data);
  }

  /**
   * Fetch active catalog definitions.
   */
  async getCatalogItems(filters: {
    branchId?: string;
    category?: string;
    page?: number;
    limit?: number;
  }) {
    return labRepository.findCatalogItems(filters);
  }

  /**
   * Places a new laboratory order.
   * Maps doctor's user ID to their clinical Doctor profile.
   */
  async placeOrder(
    data: {
      encounterId: string;
      patientId: string;
      labTestCatalogId?: string | null;
      testName: string;
      clinicalNotes?: string | null;
    },
    doctorUserId: string
  ): Promise<LabOrder> {
    // Retrieve doctor record associated with active user
    const doctor = await prisma.doctor.findUnique({
      where: { userId: doctorUserId },
    });

    if (!doctor) {
      throw new AppError("Attending doctor profile not found", 404);
    }

    let testTitle = data.testName;

    // Verify catalog item if specified
    if (data.labTestCatalogId) {
      const catalog = await labRepository.findCatalogById(data.labTestCatalogId);
      if (!catalog) {
        throw new AppError("Lab test catalog definition not found", 404);
      }
      testTitle = catalog.name;
    }

    return labRepository.createOrder({
      encounterId: data.encounterId,
      patientId: data.patientId,
      orderedById: doctor.id,
      labTestCatalogId: data.labTestCatalogId || null,
      testName: testTitle,
      clinicalNotes: data.clinicalNotes || null,
    });
  }

  /**
   * Retrieves active pending lab queue.
   */
  async getPendingOrdersQueue(filters?: { branchId?: string }): Promise<LabOrder[]> {
    return labRepository.getPendingOrders(filters);
  }

  /**
   * Record specimen collection milestone.
   */
  async collectSpecimen(orderId: string, collectorUserId: string): Promise<LabOrder> {
    const order = await labRepository.findOrderById(orderId);
    if (!order) {
      throw new AppError("Lab order not found", 404);
    }

    if (order.status !== "PENDING") {
      throw new AppError(`Cannot collect specimen for order in status: ${order.status}`, 400);
    }

    return labRepository.logSpecimenCollected(orderId, collectorUserId);
  }

  /**
   * Enter laboratory diagnostic findings and numeric outcomes.
   */
  async enterResults(
    orderId: string,
    findings: string,
    value: number | null | undefined,
    quantitativeData: any,
    techUserId: string
  ): Promise<{ order: LabOrder; result: LabResult }> {
    const order = await labRepository.findOrderById(orderId);

    if (!order) {
      throw new AppError("Lab order not found", 404);
    }

    if (order.status === "COMPLETED") {
      throw new AppError("Lab order results have already been validated and completed", 400);
    }

    if (order.status === "CANCELLED") {
      throw new AppError("Lab order has been cancelled", 400);
    }

    // Auto check reference normal bounds
    let isAbnormalFlag = false;
    if (value !== undefined && value !== null && order.labTestCatalog) {
      const min = order.labTestCatalog.normalRangeMin ? Number(order.labTestCatalog.normalRangeMin) : null;
      const max = order.labTestCatalog.normalRangeMax ? Number(order.labTestCatalog.normalRangeMax) : null;

      if (min !== null && value < min) {
        isAbnormalFlag = true;
      }
      if (max !== null && value > max) {
        isAbnormalFlag = true;
      }
    }

    return labRepository.saveResultEntry(
      orderId,
      { findings, value, isAbnormal: isAbnormalFlag, quantitativeData },
      techUserId
    );
  }

  /**
   * Pathologist validates results and releases reports.
   */
  async validateResults(orderId: string, pathologistUserId: string): Promise<{ order: LabOrder; result: LabResult }> {
    const order = await labRepository.findOrderById(orderId);

    if (!order) {
      throw new AppError("Lab order not found", 404);
    }

    if (order.status !== "PROCESSING" && order.status !== "SPECIMEN_COLLECTED") {
      throw new AppError("Lab results must be recorded before validating and releasing reports", 400);
    }

    return labRepository.validateAndCompleteResult(orderId, pathologistUserId);
  }

  /**
   * Cancel lab order and remove/void corresponding invoice charges.
   */
  async cancelOrder(orderId: string): Promise<LabOrder> {
    const order = await labRepository.findOrderById(orderId);

    if (!order) {
      throw new AppError("Lab order not found", 404);
    }

    if (order.status === "COMPLETED") {
      throw new AppError("Cannot cancel a completed lab order", 400);
    }

    return labRepository.cancelOrder(orderId);
  }

  /**
   * Retrieves diagnostic histories for a patient.
   */
  async getPatientHistory(patientId: string): Promise<(LabOrder & { results: LabResult | null })[]> {
    return labRepository.getPatientLabHistory(patientId);
  }
}

export const labService = new LabService();
