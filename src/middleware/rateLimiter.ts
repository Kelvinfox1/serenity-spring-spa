import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';
import { env } from '../config/env';

// 1. Initialize the client once
let redisClient: any = null;

if (env.REDIS_URL) {
  redisClient = createClient({ url: env.REDIS_URL });
  redisClient.connect().catch((err: Error) => console.error('Redis connection error:', err));
}

// 2. Pass a brand new RedisStore instance with a unique prefix to each limiter
export const apiLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'TOO_MANY_REQUESTS', message: 'Too many requests, please try again later.' } },
  store: redisClient 
    ? new RedisStore({
        sendCommand: (...args: string[]) => redisClient.sendCommand(args),
        prefix: 'rl:api:', // Unique prefix for general API data
      })
    : undefined, // Falls back to default memory store if Redis isn't configured
});

export const bookingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, error: { code: 'TOO_MANY_BOOKINGS', message: 'Too many booking attempts. Please wait before retrying.' } },
  store: redisClient 
    ? new RedisStore({
        sendCommand: (...args: string[]) => redisClient.sendCommand(args),
        prefix: 'rl:booking:', // Unique prefix to avoid overlapping key counts
      })
    : undefined,
});
