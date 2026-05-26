import helmet from 'helmet';
import cors from 'cors';
import { env } from '../config/env';

// Parse allowed origins from env (comma-separated)
const allowedOrigins = env.CORS_ORIGIN.split(',').map(o => o.trim());

export const securityMiddleware = [
  helmet(),
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, Postman)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    credentials: true,
  }),
];