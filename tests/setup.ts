import { beforeAll, afterAll } from 'vitest';
import { prisma } from '../src/database/prisma';

beforeAll(async () => {
  // clean database for tests
  await prisma.$executeRaw`TRUNCATE TABLE "bookings" RESTART IDENTITY CASCADE`;
});

afterAll(async () => {
  await prisma.$disconnect();
});
