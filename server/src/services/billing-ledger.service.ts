import { billingRepository } from "../repositories/billing.repository.js";
import { AppError } from "../utils/AppError.js";
import { TariffCategory, InvoiceStatus, PaymentMethod } from "@prisma/client";
import prisma from "../database/prisma.js";

export class BillingLedgerService {
  /**
   * Register or update a service pricing tariff.
   */
  async upsertTariff(data: {
    branchId: string;
    category: TariffCategory;
    name: string;
    code: string;
    price: number;
  }) {
    // Verify branch exists
    const branch = await prisma.branch.findUnique({ where: { id: data.branchId } });
    if (!branch || branch.deletedAt) {
      throw new AppError("Clinic branch not found", 404);
    }
    return billingRepository.upsertTariff(data);
  }

  /**
   * Fetch active tariffs.
   */
  async getTariffs(filters: {
    branchId?: string;
    category?: TariffCategory;
    page?: number;
    limit?: number;
  }) {
    return billingRepository.findTariffs(filters);
  }

  /**
   * Create invoice checking patient and branch relations.
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
    // Verify patient chart exists
    const patient = await prisma.patient.findUnique({ where: { id: data.patientId } });
    if (!patient || patient.deletedAt) {
      throw new AppError("Patient chart not found", 404);
    }

    // Verify branch exists
    const branch = await prisma.branch.findUnique({ where: { id: data.branchId } });
    if (!branch || branch.deletedAt) {
      throw new AppError("Branch record not found", 404);
    }

    return billingRepository.createInvoice(data);
  }

  /**
   * Fetch invoices list.
   */
  async getInvoices(filters: {
    status?: InvoiceStatus;
    patientId?: string;
    branchId?: string;
    page?: number;
    limit?: number;
  }) {
    return billingRepository.findInvoices(filters);
  }

  /**
   * Retrieve invoice by ID.
   */
  async getInvoiceById(id: string) {
    const invoice = await billingRepository.findById(id);
    if (!invoice) {
      throw new AppError("Invoice not found", 404);
    }
    return invoice;
  }

  /**
   * Process and log cashier payment.
   */
  async recordPayment(data: {
    invoiceId: string;
    amount: number;
    method: PaymentMethod;
    referenceNumber?: string | null;
    cashierId: string;
    notes?: string | null;
  }) {
    return billingRepository.recordPayment(data);
  }

  /**
   * Fetch payments ledger history.
   */
  async getPayments(filters: {
    branchId?: string;
    cashierId?: string;
    page?: number;
    limit?: number;
  }) {
    return billingRepository.findPayments(filters);
  }

  /**
   * Compile ledger summaries for dashboard visualization.
   */
  async getLedgerReports(branchId: string) {
    // Verify branch
    const branch = await prisma.branch.findUnique({ where: { id: branchId } });
    if (!branch) {
      throw new AppError("Branch not found", 404);
    }

    const [invoices, payments] = await Promise.all([
      prisma.invoice.findMany({
        where: { branchId, deletedAt: null }
      }),
      prisma.payment.findMany({
        where: { invoice: { branchId } }
      })
    ]);

    let totalBilled = 0;
    let totalCollected = 0;
    let cashBilled = 0;
    let cardBilled = 0;
    let mobileMoneyBilled = 0;
    let insuranceBilled = 0;

    invoices.forEach((inv) => {
      totalBilled += Number(inv.totalAmount);
    });

    payments.forEach((pay) => {
      const amt = Number(pay.amount);
      totalCollected += amt;
      
      if (pay.method === "CASH") {
        cashBilled += amt;
      } else if (pay.method === "CARD") {
        cardBilled += amt;
      } else if (pay.method === "MOBILE_MONEY") {
        mobileMoneyBilled += amt;
      } else if (pay.method === "INSURANCE") {
        insuranceBilled += amt;
      }
    });

    return {
      totalBilled,
      totalCollected,
      outstandingAmount: totalBilled - totalCollected,
      cashCollected: cashBilled,
      cardCollected: cardBilled,
      mobileMoneyCollected: mobileMoneyBilled,
      insuranceCollected: insuranceBilled
    };
  }
}

export const billingLedgerService = new BillingLedgerService();
