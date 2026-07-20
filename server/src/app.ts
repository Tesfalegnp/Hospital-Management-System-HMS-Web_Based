import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";

import { config } from "./config/index.js";
import { morganMiddleware } from "./logger/morgan.js";
import { notFound } from "./middleware/notFound.js";
import { errorHandler } from "./middleware/errorHandler.js";
import appointmentRoutes from "./routes/appointment.routes.js";
import consultationRoutes from "./routes/consultation.routes.js";
import authRoutes from "./routes/auth.routes.js";
import labRoutes from "./routes/lab.routes.js";
import pharmacyRoutes from "./routes/pharmacy.routes.js";
import patientRoutes from "./routes/patient.routes.js";
import inventoryRoutes from "./routes/inventory.routes.js";
import prescriptionRoutes from "./routes/prescription.routes.js";
import billingRoutes from "./routes/billing.routes.js";
import ipdRoutes from "./routes/ipd.routes.js";
import userRoutes from "./routes/user.routes.js";


const app = express();


/**
 * Security Middleware
 */
app.use(helmet());

/**
 * CORS Configuration
 */
app.use(
  cors({
    origin: config.CLIENT_URL,
    credentials: true,
  }),
);

/**
 * Compression Middleware
 */
app.use(compression());

/**
 * HTTP Request Logger
 */
app.use(morganMiddleware);

/**
 * Body Parsers
 */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * Cookie Parser
 */
app.use(cookieParser());

/**
 * Health Check Route
 */
app.get("/api/v1/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Hospital Management System API is running.",
    timestamp: new Date().toISOString(),
  });
});

/**
 * API Routes
 */
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/appointments", appointmentRoutes);
app.use("/api/v1/consultations", consultationRoutes);
app.use("/api/v1/labs", labRoutes);
app.use("/api/v1/pharmacy", pharmacyRoutes);
app.use("/api/v1/patients", patientRoutes);
app.use("/api/v1/pharmacy/inventory", inventoryRoutes);
app.use("/api/v1/pharmacy/prescriptions", prescriptionRoutes);
app.use("/api/v1/billing", billingRoutes);
app.use("/api/v1/ipd", ipdRoutes);
app.use("/api/v1/users", userRoutes);


/**
 * 404 Middleware
 * This must come AFTER all routes.
 */
app.use(notFound);

/**
 * Global Error Handler
 * This must be the LAST middleware.
 */
app.use(errorHandler);

export default app;