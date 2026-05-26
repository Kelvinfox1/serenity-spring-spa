import { Router } from 'express';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';
import { BookingRepository } from './booking.repository';
import { prisma } from '../../database/prisma';
import { validate } from '../../middleware/validate';
import { createBookingSchema } from './booking.schema';

const router = Router();
const repo = new BookingRepository(prisma);
const service = new BookingService(repo);
const controller = new BookingController(service);

router.post('/', validate(createBookingSchema), controller.create);

export { router as bookingRoutes };
