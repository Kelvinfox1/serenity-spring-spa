import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { AppError } from '../shared/errors';

/**
 * Formats Zod errors into a simple field -> message map.
 */
function formatZodErrors(error: ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    // Use the first path element as field name (e.g., "firstName")
    const field = issue.path[0]?.toString() || 'unknown';
    // Only keep the first error per field (or concatenate multiple)
    if (!fieldErrors[field]) {
      fieldErrors[field] = issue.message;
    }
  }
  return fieldErrors;
}

export const validate = (schema: ZodSchema) => (req: Request, _res: Response, next: NextFunction) => {
  try {
    const result = schema.parse(req.body);
    req.validatedBody = result;
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      const fieldErrors = formatZodErrors(error);
      // Create a custom error that contains the field-level details
      const appError = new AppError('VALIDATION_ERROR', 'Validation failed', 400);
      // Attach the field errors to the error object (we'll extract it in the error handler)
      (appError as any).fieldErrors = fieldErrors;
      return next(appError);
    }
    next(error);
  }
};

declare global {
  namespace Express {
    interface Request {
      validatedBody: any;
    }
  }
}