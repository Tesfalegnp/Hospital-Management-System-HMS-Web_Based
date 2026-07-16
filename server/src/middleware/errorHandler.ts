import { NextFunction, Request, Response } from "express";

import { config } from "../config";
import { logger } from "../logger";
import { AppError } from "../utils/AppError";

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  let error = err;

  if (!(error instanceof AppError)) {
    logger.error(error);

    error = new AppError(
      config.NODE_ENV === "production"
        ? "Internal Server Error"
        : error.message,
      500,
    );
  }

  logger.error({
    method: req.method,
    path: req.originalUrl,
    statusCode: error.statusCode,
    message: error.message,
    stack: error.stack,
  });

  res.status(error.statusCode).json({
    success: false,
    status: error.status,
    message: error.message,
    ...(config.NODE_ENV === "development" && {
      stack: error.stack,
    }),
  });
};