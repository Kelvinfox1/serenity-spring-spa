import { Request, Response } from 'express';
import { BookingService } from './booking.service';
import { asyncHandler } from '../../middleware/errorHandler';

export class BookingController {
  constructor(private service: BookingService) {}

  create = asyncHandler(async (req: Request, res: Response) => {
    const result = await this.service.createBooking(req.validatedBody);
    res.status(201).json(result);
  });
}
