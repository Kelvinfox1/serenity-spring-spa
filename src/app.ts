import express from 'express';
import { securityMiddleware } from './middleware/security';
import { requestIdMiddleware } from './middleware/requestId';
import { errorHandler } from './middleware/errorHandler';
import { bookingRoutes } from './modules/bookings/booking.routes';
import { apiLimiter, bookingLimiter } from './middleware/rateLimiter';
import { requestLogger } from './middleware/requestLogger';

const app = express();

app.use(requestIdMiddleware);
app.use(securityMiddleware);
app.use(express.json({ limit: '1mb' }));
app.use(apiLimiter);
app.use(requestLogger);

app.use('/api/v1/bookings', bookingLimiter, bookingRoutes);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use((_req, res) => {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Resource not found' } });
});

app.use(errorHandler);

export { app };
