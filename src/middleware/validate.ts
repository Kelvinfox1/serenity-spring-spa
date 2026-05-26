import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { AppError } from '../shared/errors';

export const validate = (schema: ZodSchema) => (req: Request, _res: Response, next: NextFunction) => {
  try {
    const result = schema.parse(req.body);
    req.validatedBody = result;
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      const details = error.errors.map((e) => e.message).join(', ');
      next(new AppError('VALIDATION_ERROR', `Validation failed: ${details}`, 400));
    } else {
      next(error);
    }
  }
};

declare global {
  namespace Express {
    interface Request {
      validatedBody: any;
    }
  }
}
