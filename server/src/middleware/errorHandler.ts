import { NextFunction, Request, Response } from "express";

import { config } from "../config/index.js";
import { logger } from "../logger/index.js";
import { AppError } from "../utils/AppError.js";

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  let appError: AppError;

  if (err instanceof AppError) {
    appError = err;
  } else {
    logger.error(err);
    appError = new AppError(
      config.NODE_ENV === "production" ? "Internal Server Error" : err.message,
      500,
    );
  }

  logger.error({
    method: req.method,
    path: req.originalUrl,
    statusCode: appError.statusCode,
    message: appError.message,
    stack: appError.stack,
  });

  res.status(appError.statusCode).json({
    success: false,
    status: appError.status,
    message: appError.message,
    ...(config.NODE_ENV === "development" && {
      stack: appError.stack,
    }),
  });
};