import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { authenticateJWT, requireRoles } from "../middleware/auth.middleware.js";
import { Role } from "@prisma/client";
import {
  getTariffs,
  upsertTariff,
  createInvoice,
  getInvoices,
  getInvoiceById,
  recordPayment,
  getPayments,
  getLedgerReports,
} from "../controllers/billing.controller.js";
import {
  createTariffSchema,
  createInvoiceSchema,
  recordPaymentSchema,
} from "../validators/billing.validator.js";

const router = Router();

// All billing routes require authentication
router.use(authenticateJWT);

// GET tariffs lists (accessible to Clinicians, Cashiers, and Admins)
router.get(
  "/tariffs",
  requireRoles(Role.DOCTOR, Role.PHARMACIST, Role.ACCOUNTANT, Role.ADMIN, Role.SUPER_ADMIN),
  getTariffs
);

// POST register/update tariff price (restricted to Admins only)
router.post(
  "/tariffs",
  requireRoles(Role.ADMIN, Role.SUPER_ADMIN),
  validate(createTariffSchema),
  upsertTariff
);

// POST create invoice
router.post(
  "/invoices",
  requireRoles(Role.DOCTOR, Role.ACCOUNTANT, Role.ADMIN, Role.SUPER_ADMIN),
  validate(createInvoiceSchema),
  createInvoice
);

// GET invoices cashier queue worklist
router.get(
  "/invoices",
  requireRoles(Role.ACCOUNTANT, Role.ADMIN, Role.SUPER_ADMIN),
  getInvoices
);

// GET detailed invoice profile
router.get(
  "/invoices/:id",
  requireRoles(Role.ACCOUNTANT, Role.ADMIN, Role.SUPER_ADMIN),
  getInvoiceById
);

// POST capture payment collections
router.post(
  "/invoices/:id/payments",
  requireRoles(Role.ACCOUNTANT, Role.ADMIN, Role.SUPER_ADMIN),
  validate(recordPaymentSchema),
  recordPayment
);

// GET payments transactional audit log
router.get(
  "/payments",
  requireRoles(Role.ACCOUNTANT, Role.ADMIN, Role.SUPER_ADMIN),
  getPayments
);

// GET branch ledger summaries
router.get(
  "/reports",
  requireRoles(Role.ADMIN, Role.SUPER_ADMIN),
  getLedgerReports
);

export default router;
