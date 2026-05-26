import { Request, Response, NextFunction } from 'express';
import { AppError } from '../shared/errors';
import { logger } from '../shared/logger';

export const errorHandler = (err: Error, req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof AppError) {
    const responsePayload: any = {
      success: false,
      error: {
        code: err.code,
        message: err.message,
      },
    };
    // If field errors are attached, add them to the response
    if ((err as any).fieldErrors) {
      responsePayload.error.fields = (err as any).fieldErrors;
    }
    return res.status(err.statusCode).json(responsePayload);
  }

  // Unexpected errors
  logger.error({ err, requestId: req.headers['x-request-id'] });
  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred.',
    },
  });
};

export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };