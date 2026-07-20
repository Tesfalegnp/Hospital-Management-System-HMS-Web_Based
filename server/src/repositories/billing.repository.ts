import prisma from "../database/prisma.js";
import { Prisma, Tariff, Invoice, Payment, InvoiceStatus, TariffCategory, PaymentMethod } from "@prisma/client";
import { AppError } from "../utils/AppError.js";

export class BillingRepository {
  /**
   * Find paginated list of Tariffs by branch.
   */
  async findTariffs(filters: {
    branchId?: string;
    category?: TariffCategory;
    page?: number;
    limit?: number;
  }) {
    const { branchId, category, page = 1, limit = 10 } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.TariffWhereInput = { deletedAt: null };

    if (branchId) {
      where.branchId = branchId;
    }
    if (category) {
      where.category = category;
    }

    const [items, total] = await Promise.all([
      prisma.tariff.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ category: "asc" }, { code: "asc" }],
      }),
      prisma.tariff.count({ where }),
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
   * Register or update a service tariff.
   */
  async upsertTariff(data: {
    branchId: string;
    category: TariffCategory;
    name: string;
    code: string;
    price: number;
  }) {
    return prisma.tariff.upsert({
      where: {
        branchId_code: {
          branchId: data.branchId,
          code: data.code,
        },
      },
      create: {
        branchId: data.branchId,
        category: data.category,
        name: data.name,
        code: data.code,
        price: data.price,
      },
      update: {
        name: data.name,
        category: data.category,
        price: data.price,
        deletedAt: null,
      },
    });
  }

  /**
   * Find a tariff by code and branch.
   */
  async findTariffByCode(branchId: string, code: string) {
    return prisma.tariff.findUnique({
      where: {
        branchId_code: {
          branchId,
          code,
        },
      },
    });
  }

  /**
   * Generate an invoice with its line items.
   */
  async createInvoice(data: {
    patientId: string;
    branchId: string;
    notes?: string | null;
    items: {
      name: string;
      quantity: number;
      unitPrice: number;
      consultationId?: string | null;
      labOrderId?: string | null;
      dispenseRecordId?: string | null;
    }[];
  }) {
    return prisma.$transaction(async (t) => {
      // 1. Calculate invoice total
      let total = 0;
      const invoiceItems = data.items.map((item) => {
        const itemTotal = item.quantity * item.unitPrice;
        total += itemTotal;
        return {
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: itemTotal,
          consultationId: item.consultationId || null,
          labOrderId: item.labOrderId || null,
          dispenseRecordId: item.dispenseRecordId || null,
        };
      });

      // 2. Create the Invoice
      const invoice = await t.invoice.create({
        data: {
          patientId: data.patientId,
          branchId: data.branchId,
          status: "PENDING",
          totalAmount: total,
          paidAmount: 0,
          notes: data.notes || null,
          items: {
            create: invoiceItems,
          },
        },
        include: {
          items: true,
        },
      });

      return invoice;
    });
  }

  /**
   * Find invoices with optional filters (e.g. Cashier worklist queue).
   */
  async findInvoices(filters: {
    status?: InvoiceStatus;
    patientId?: string;
    branchId?: string;
    page?: number;
    limit?: number;
  }) {
    const { status, patientId, branchId, page = 1, limit = 10 } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.InvoiceWhereInput = { deletedAt: null };

    if (status) {
      where.status = status;
    }
    if (patientId) {
      where.patientId = patientId;
    }
    if (branchId) {
      where.branchId = branchId;
    }

    const [items, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          patient: {
            include: { user: true },
          },
          items: true,
        },
      }),
      prisma.invoice.count({ where }),
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
   * Find specific invoice by ID.
   */
  async findById(id: string) {
    return prisma.invoice.findFirst({
      where: { id, deletedAt: null },
      include: {
        patient: {
          include: { user: true },
        },
        items: true,
        payments: {
          include: {
            cashier: true,
          },
        },
      },
    });
  }

  /**
   * Record a payment transaction inside a transaction.
   */
  async recordPayment(data: {
    invoiceId: string;
    amount: number;
    method: PaymentMethod;
    referenceNumber?: string | null;
    cashierId: string;
    notes?: string | null;
  }) {
    return prisma.$transaction(async (t) => {
      // 1. Fetch current invoice to verify remaining balance
      const invoice = await t.invoice.findUnique({
        where: { id: data.invoiceId },
      });

      if (!invoice || invoice.deletedAt) {
        throw new AppError("Invoice not found", 404);
      }

      if (invoice.status === "PAID") {
        throw new AppError("Invoice has already been fully paid", 400);
      }

      const outstanding = Number(invoice.totalAmount) - Number(invoice.paidAmount);
      if (data.amount > outstanding) {
        throw new AppError(
          `Payment amount ($${data.amount}) exceeds outstanding invoice balance ($${outstanding.toFixed(2)})`,
          400
        );
      }

      // 2. Create the Payment record
      const payment = await t.payment.create({
        data: {
          invoiceId: data.invoiceId,
          amount: data.amount,
          method: data.method,
          referenceNumber: data.referenceNumber || null,
          cashierId: data.cashierId,
          notes: data.notes || null,
        },
      });

      // 3. Update invoice paid amount and check status
      const newPaidAmount = Number(invoice.paidAmount) + data.amount;
      let nextStatus: InvoiceStatus = "PARTIALLY_PAID";
      if (newPaidAmount >= Number(invoice.totalAmount)) {
        nextStatus = "PAID";
      }

      const updatedInvoice = await t.invoice.update({
        where: { id: data.invoiceId },
        data: {
          paidAmount: newPaidAmount,
          status: nextStatus,
        },
        include: {
          items: true,
          payments: true,
        },
      });

      return {
        payment,
        invoice: updatedInvoice,
      };
    });
  }

  /**
   * Query financial payments log.
   */
  async findPayments(filters: {
    branchId?: string;
    cashierId?: string;
    page?: number;
    limit?: number;
  }) {
    const { branchId, cashierId, page = 1, limit = 10 } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.PaymentWhereInput = {};

    if (cashierId) {
      where.cashierId = cashierId;
    }
    if (branchId) {
      where.invoice = { branchId };
    }

    const [items, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          invoice: {
            include: {
              patient: {
                include: { user: true },
              },
            },
          },
          cashier: true,
        },
      }),
      prisma.payment.count({ where }),
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
}

export const billingRepository = new BillingRepository();
