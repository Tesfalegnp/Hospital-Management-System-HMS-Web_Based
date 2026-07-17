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
app.use("/api/v1/appointments", appointmentRoutes);
app.use("/api/v1/consultations", consultationRoutes);

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