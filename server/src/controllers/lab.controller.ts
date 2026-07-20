import { Request, Response } from "express";
import { labService } from "../services/lab.service.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { AppError } from "../utils/AppError.js";

/**
 * Controller for managing laboratory orders and results.
 */
export const createOrder = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError("Authentication required", 401);
  }

  const order = await labService.placeOrder(
    {
      encounterId: req.body.encounterId as string,
      patientId: req.body.patientId as string,
      testName: req.body.testName as string,
      clinicalNotes: req.body.clinicalNotes as string,
    },
    req.user.id
  );

  res.status(201).json({
    success: true,
    message: "Laboratory order placed successfully",
    data: order,
  });
});

export const getQueue = asyncHandler(async (req: Request, res: Response) => {
  const queue = await labService.getPendingOrdersQueue();

  res.status(200).json({
    success: true,
    data: queue,
  });
});

export const collectSpecimen = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError("Authentication required", 401);
  }

  const orderId = req.params.id as string;
  const order = await labService.collectSpecimen(orderId, req.user.id);

  res.status(200).json({
    success: true,
    message: "Specimen collection recorded successfully",
    data: order,
  });
});

export const enterResults = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError("Authentication required", 401);
  }

  const orderId = req.params.id as string;
  const { findings, value, quantitativeData } = req.body;

  const data = await labService.enterResults(
    orderId,
    findings as string,
    value as number | undefined,
    quantitativeData,
    req.user.id
  );

  res.status(200).json({
    success: true,
    message: "Laboratory results entered successfully",
    data,
  });
});

export const validateResults = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError("Authentication required", 401);
  }

  const orderId = req.params.id as string;
  const data = await labService.validateResults(orderId, req.user.id);

  res.status(200).json({
    success: true,
    message: "Laboratory results validated and finalized",
    data,
  });
});

export const cancelOrder = asyncHandler(async (req: Request, res: Response) => {
  const orderId = req.params.id as string;
  const order = await labService.cancelOrder(orderId);

  res.status(200).json({
    success: true,
    message: "Laboratory order cancelled successfully",
    data: order,
  });
});

export const getHistory = asyncHandler(async (req: Request, res: Response) => {
  const patientId = req.params.patientId as string;
  
  const history = await labService.getPatientHistory(patientId);

  res.status(200).json({
    success: true,
    data: history,
  });
});
