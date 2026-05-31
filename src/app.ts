import express from 'express';
import { securityMiddleware } from './middleware/security';
import { requestIdMiddleware } from './middleware/requestId';
import { errorHandler } from './middleware/errorHandler';
import { bookingRoutes } from './modules/bookings/booking.routes';
import { apiLimiter } from './middleware/rateLimiter';
import { requestLogger } from './middleware/requestLogger'; // if you have one

const app = express();
app.set('trust proxy', 1); 

// Global middleware
app.use(requestIdMiddleware);
app.use(...securityMiddleware);
app.use(express.json({ limit: '1mb' }));

// Request logging (if any)
app.use(requestLogger);

// Health check – must be before rate limiting
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// Global rate limiter for all other routes
app.use(apiLimiter);

// Booking routes
app.use('/api/v1/bookings', bookingRoutes);

// 404
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'Resource not found' },
  });
});

// Error handler
app.use(errorHandler);

export { app };