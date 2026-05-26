import helmet from 'helmet';
import cors from 'cors';
import { env } from '../config/env';

export const securityMiddleware = [
  helmet(),
  cors({
    origin: env.CORS_ORIGIN,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    credentials: true,
  }),
];
