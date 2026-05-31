import { Request, Response } from 'express';
import { BookingService } from './booking.service';
import { asyncHandler } from '../../middleware/errorHandler';

export class BookingController {
  constructor(private service: BookingService) {}

  create = asyncHandler(async (req: Request, res: Response) => {
    const result = await this.service.createBooking(req.validatedBody);
    res.status(201).json(result);
  });

  getAll = asyncHandler(async (_req: Request, res: Response) => {
    const bookings = await this.service.getAllBookings();
    res.json({ success: true, data: bookings });
  });
}
