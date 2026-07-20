import prisma from "../database/prisma.js";
import { Prisma, Ward, Bed, Admission, VitalsLog, BedStatus, AdmissionStatus } from "@prisma/client";
import { AppError } from "../utils/AppError.js";

export class IpdRepository {
  /**
   * List paginated wards including beds.
   */
  async findWards(filters: { branchId?: string; page?: number; limit?: number }) {
    const { branchId, page = 1, limit = 10 } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.WardWhereInput = { deletedAt: null };

    if (branchId) {
      where.branchId = branchId;
    }

    const [items, total] = await Promise.all([
      prisma.ward.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: "asc" },
        include: {
          beds: {
            where: { deletedAt: null },
            orderBy: { bedNumber: "asc" },
          },
        },
      }),
      prisma.ward.count({ where }),
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
   * Create a Ward.
   */
  async createWard(data: {
    branchId: string;
    name: string;
    code: string;
    dailyTariffCode: string;
  }) {
    return prisma.ward.create({
      data: {
        branchId: data.branchId,
        name: data.name,
        code: data.code,
        dailyTariffCode: data.dailyTariffCode,
      },
    });
  }

  /**
   * Create a Bed inside a Ward.
   */
  async createBed(data: { wardId: string; bedNumber: string }) {
    return prisma.bed.create({
      data: {
        wardId: data.wardId,
        bedNumber: data.bedNumber,
        status: "AVAILABLE",
      },
    });
  }

  /**
   * Find a Bed by ID.
   */
  async findBedById(id: string) {
    return prisma.bed.findFirst({
      where: { id, deletedAt: null },
      include: { ward: true },
    });
  }

  /**
   * Update Bed occupancy status.
   */
  async updateBedStatus(id: string, status: BedStatus) {
    return prisma.bed.update({
      where: { id },
      data: { status },
    });
  }

  /**
   * Execute inpatient patient admission in a database transaction.
   */
  async admitPatient(data: {
    patientId: string;
    admittingDoctorId: string;
    bedId: string;
  }) {
    return prisma.$transaction(async (t) => {
      // 1. Mark the bed as OCCUPIED
      await t.bed.update({
        where: { id: data.bedId },
        data: { status: "OCCUPIED" },
      });

      // 2. Create the Admission record
      const admission = await t.admission.create({
        data: {
          patientId: data.patientId,
          admittingDoctorId: data.admittingDoctorId,
          bedId: data.bedId,
          status: "ADMITTED",
          admissionDate: new Date(),
        },
      });

      return admission;
    });
  }

  /**
   * Fetch active admissions.
   */
  async findActiveAdmissions(filters: {
    wardId?: string;
    branchId?: string;
    page?: number;
    limit?: number;
  }) {
    const { wardId, branchId, page = 1, limit = 10 } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.AdmissionWhereInput = {
      status: "ADMITTED",
      deletedAt: null,
    };

    if (wardId) {
      where.bed = { wardId };
    }
    if (branchId) {
      where.bed = { ward: { branchId } };
    }

    const [items, total] = await Promise.all([
      prisma.admission.findMany({
        where,
        skip,
        take: limit,
        orderBy: { admissionDate: "desc" },
        include: {
          patient: {
            include: { user: true },
          },
          admittingDoctor: {
            include: { user: true },
          },
          bed: {
            include: { ward: true },
          },
        },
      }),
      prisma.admission.count({ where }),
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
   * Find specific admission details with vitals logs.
   */
  async findAdmissionById(id: string) {
    return prisma.admission.findFirst({
      where: { id, deletedAt: null },
      include: {
        patient: {
          include: { user: true },
        },
        admittingDoctor: {
          include: { user: true },
        },
        bed: {
          include: { ward: true },
        },
        vitalsLogs: {
          orderBy: { createdAt: "desc" },
          include: {
            recordedBy: true,
          },
        },
      },
    });
  }

  /**
   * execute bed transfer posting daily room charges to invoice.
   */
  async transferPatient(admissionId: string, targetBedId: string) {
    return prisma.$transaction(async (t) => {
      // 1. Fetch active admission with current bed and ward
      const admission = await t.admission.findUnique({
        where: { id: admissionId },
        include: {
          bed: {
            include: { ward: true },
          },
        },
      });

      if (!admission || admission.status !== "ADMITTED") {
        throw new AppError("Active admission record not found", 404);
      }

      const sourceBed = admission.bed;
      const sourceWard = sourceBed.ward;

      // 2. Calculate daily room charges
      const admissionDate = new Date(admission.admissionDate);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - admissionDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const elapsedDays = diffDays > 0 ? diffDays : 1;

      // Look up tariff price
      const tariff = await t.tariff.findUnique({
        where: {
          branchId_code: {
            branchId: sourceWard.branchId,
            code: sourceWard.dailyTariffCode,
          },
        },
      });
      const dailyPrice = tariff ? Number(tariff.price) : 50.00; // default fallback if no tariff mapped
      const totalRoomCharge = elapsedDays * dailyPrice;

      // Find or create pending invoice
      let invoice = await t.invoice.findFirst({
        where: {
          patientId: admission.patientId,
          branchId: sourceWard.branchId,
          status: { in: ["PENDING", "PARTIALLY_PAID"] },
        },
      });

      if (!invoice) {
        invoice = await t.invoice.create({
          data: {
            patientId: admission.patientId,
            branchId: sourceWard.branchId,
            status: "PENDING",
            totalAmount: 0,
            paidAmount: 0,
          },
        });
      }

      // Add Room Charge Invoice Line Item
      await t.invoiceItem.create({
        data: {
          invoiceId: invoice.id,
          name: `Daily Room Charge: ${sourceWard.name} (${elapsedDays} days)`,
          quantity: elapsedDays,
          unitPrice: dailyPrice,
          totalPrice: totalRoomCharge,
        },
      });

      // Update Invoice Total
      await t.invoice.update({
        where: { id: invoice.id },
        data: {
          totalAmount: Number(invoice.totalAmount) + totalRoomCharge,
        },
      });

      // 3. Mark old bed as CLEANING
      await t.bed.update({
        where: { id: sourceBed.id },
        data: { status: "CLEANING" },
      });

      // 4. Mark target bed as OCCUPIED
      await t.bed.update({
        where: { id: targetBedId },
        data: { status: "OCCUPIED" },
      });

      // 5. Update Admission record bed pointer
      const updatedAdmission = await t.admission.update({
        where: { id: admissionId },
        data: {
          bedId: targetBedId,
          admissionDate: new Date(), // Reset start duration for next bed charges tracking
        },
        include: {
          bed: {
            include: { ward: true },
          },
        },
      });

      return updatedAdmission;
    });
  }

  /**
   * Discharge patient and post final room charges.
   */
  async dischargePatient(admissionId: string, dischargeNotes?: string | null) {
    return prisma.$transaction(async (t) => {
      // 1. Fetch active admission with current bed and ward
      const admission = await t.admission.findUnique({
        where: { id: admissionId },
        include: {
          bed: {
            include: { ward: true },
          },
        },
      });

      if (!admission || admission.status !== "ADMITTED") {
        throw new AppError("Active admission record not found", 404);
      }

      const bed = admission.bed;
      const ward = bed.ward;

      // 2. Calculate daily room charges
      const admissionDate = new Date(admission.admissionDate);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - admissionDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const elapsedDays = diffDays > 0 ? diffDays : 1;

      // Look up tariff price
      const tariff = await t.tariff.findUnique({
        where: {
          branchId_code: {
            branchId: ward.branchId,
            code: ward.dailyTariffCode,
          },
        },
      });
      const dailyPrice = tariff ? Number(tariff.price) : 50.00;
      const totalRoomCharge = elapsedDays * dailyPrice;

      // Find or create pending invoice
      let invoice = await t.invoice.findFirst({
        where: {
          patientId: admission.patientId,
          branchId: ward.branchId,
          status: { in: ["PENDING", "PARTIALLY_PAID"] },
        },
      });

      if (!invoice) {
        invoice = await t.invoice.create({
          data: {
            patientId: admission.patientId,
            branchId: ward.branchId,
            status: "PENDING",
            totalAmount: 0,
            paidAmount: 0,
          },
        });
      }

      // Add Room Charge Invoice Line Item
      await t.invoiceItem.create({
        data: {
          invoiceId: invoice.id,
          name: `Final Room Charge: ${ward.name} (${elapsedDays} days)`,
          quantity: elapsedDays,
          unitPrice: dailyPrice,
          totalPrice: totalRoomCharge,
        },
      });

      // Update Invoice Total
      await t.invoice.update({
        where: { id: invoice.id },
        data: {
          totalAmount: Number(invoice.totalAmount) + totalRoomCharge,
        },
      });

      // 3. Mark bed as CLEANING
      await t.bed.update({
        where: { id: bed.id },
        data: { status: "CLEANING" },
      });

      // 4. Update Admission record status
      const updatedAdmission = await t.admission.update({
        where: { id: admissionId },
        data: {
          status: "DISCHARGED",
          dischargeDate: new Date(),
          dischargeNotes: dischargeNotes || null,
        },
      });

      return updatedAdmission;
    });
  }

  /**
   * Log patient vital sign reading.
   */
  async logVitals(data: {
    admissionId: string;
    recordedById: string;
    temperature?: number | null;
    bloodPressure?: string | null;
    heartRate?: number | null;
    respiratoryRate?: number | null;
    oxygenSaturation?: number | null;
    notes?: string | null;
  }) {
    return prisma.vitalsLog.create({
      data: {
        admissionId: data.admissionId,
        recordedById: data.recordedById,
        temperature: data.temperature || null,
        bloodPressure: data.bloodPressure || null,
        heartRate: data.heartRate || null,
        respiratoryRate: data.respiratoryRate || null,
        oxygenSaturation: data.oxygenSaturation || null,
        notes: data.notes || null,
      },
    });
  }
}

export const ipdRepository = new IpdRepository();
