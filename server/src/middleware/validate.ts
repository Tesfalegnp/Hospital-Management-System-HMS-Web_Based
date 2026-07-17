import { Request, Response, NextFunction, RequestHandler } from "express";
import { ZodType, ZodError } from "zod";
import { AppError } from "../utils/AppError.js";

/**
 * Reusable validation middleware that validates Express requests (body, query, and/or params)
 * against a Zod schema object.
 */
export const validate = (schema: ZodType<any>): RequestHandler => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      if (parsed.body !== undefined) req.body = parsed.body;
      if (parsed.query !== undefined) req.query = parsed.query;
      if (parsed.params !== undefined) req.params = parsed.params;

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join(", ");
        next(new AppError(`Validation failed: ${errorMessages}`, 400));
      } else {
        next(error);
      }
    }
  };
};
