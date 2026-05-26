import { Queue } from 'bullmq';
import { env } from '../config/env';

export const emailQueue = new Queue('email-queue', {
  connection: { url: env.REDIS_URL },
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
  },
});
