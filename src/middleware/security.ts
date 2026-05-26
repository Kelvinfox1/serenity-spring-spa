import helmet from 'helmet';
import cors from 'cors';
import { env } from '../config/env';

const allowedOrigins = env.CORS_ORIGIN.split(',')
  .map(o => o.trim())
  .filter(o => o.length > 0);

export const securityMiddleware = [
  helmet(),
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, Postman)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        // Callback with false -> CORS will return a 403 (or omit header)
        callback(null, false);
      }
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    credentials: true,
  }),
];