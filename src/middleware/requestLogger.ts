import { Request, Response, NextFunction } from 'express';
import { logger } from '../shared/logger';

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info(
      {
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        duration: Date.now() - start,
        requestId: req.requestId,
      },
      'request completed',
    );
  });
  next();
};
