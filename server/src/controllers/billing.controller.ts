import { Request, Response } from "express";
import { billingLedgerService } from "../services/billing-ledger.service.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { AppError } from "../utils/AppError.js";
import { InvoiceStatus, TariffCategory, PaymentMethod } from "@prisma/client";

/**
 * Controller for managing tariffs, invoicing, and payments collection.
 */
export const getTariffs = asyncHandler(async (req: Request, res: Response) => {
  const { branchId, category, page, limit } = req.query;

  const result = await billingLedgerService.getTariffs({
    branchId: branchId ? String(branchId) : undefined,
    category: category ? (String(category) as TariffCategory) : undefined,
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
  });

  res.status(200).json({
    success: true,
    data: result.data,
    pagination: result.pagination,
  });
});

export const upsertTariff = asyncHandler(async (req: Request, res: Response) => {
  const { branchId, category, name, code, price } = req.body;

  const tariff = await billingLedgerService.upsertTariff({
    branchId,
    category,
    name,
    code,
    price: Number(price),
  });

  res.status(200).json({
    success: true,
    message: "Tariff pricing successfully registered",
    data: tariff,
  });
});

export const createInvoice = asyncHandler(async (req: Request, res: Response) => {
  const { patientId, branchId, notes, items } = req.body;

  const invoice = await billingLedgerService.createInvoice({
    patientId,
    branchId,
    notes,
    items,
  });

  res.status(201).json({
    success: true,
    message: "Invoice generated successfully",
    data: invoice,
  });
});

export const getInvoices = asyncHandler(async (req: Request, res: Response) => {
  const { status, patientId, branchId, page, limit } = req.query;

  const result = await billingLedgerService.getInvoices({
    status: status ? (String(status) as InvoiceStatus) : undefined,
    patientId: patientId ? String(patientId) : undefined,
    branchId: branchId ? String(branchId) : undefined,
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
  });

  res.status(200).json({
    success: true,
    data: result.data,
    pagination: result.pagination,
  });
});

export const getInvoiceById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const invoice = await billingLedgerService.getInvoiceById(String(id));

  res.status(200).json({
    success: true,
    data: invoice,
  });
});

export const recordPayment = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError("Authentication required", 401);
  }

  const { id } = req.params; // Invoice ID
  const { amount, method, referenceNumber, notes } = req.body;

  const result = await billingLedgerService.recordPayment({
    invoiceId: String(id),
    amount: Number(amount),
    method: method as PaymentMethod,
    referenceNumber,
    cashierId: req.user.id,
    notes,
  });

  res.status(200).json({
    success: true,
    message: "Payment transaction recorded successfully",
    data: result,
  });
});

export const getPayments = asyncHandler(async (req: Request, res: Response) => {
  const { branchId, cashierId, page, limit } = req.query;

  const result = await billingLedgerService.getPayments({
    branchId: branchId ? String(branchId) : undefined,
    cashierId: cashierId ? String(cashierId) : undefined,
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
  });

  res.status(200).json({
    success: true,
    data: result.data,
    pagination: result.pagination,
  });
});

export const getLedgerReports = asyncHandler(async (req: Request, res: Response) => {
  const { branchId } = req.query;

  if (!branchId) {
    throw new AppError("Branch ID is required to fetch ledger reports", 400);
  }

  const report = await billingLedgerService.getLedgerReports(String(branchId));

  res.status(200).json({
    success: true,
    data: report,
  });
});
