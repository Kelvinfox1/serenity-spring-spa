import { BookingRepository } from './booking.repository';
import { CreateBookingInput } from './booking.schema';
import { generateReferenceId } from '../../shared/response';
import { AppError } from '../../shared/errors';
import { emailQueue } from '../../workers/emailQueue';

export class BookingService {
  constructor(private repo: BookingRepository) {}

  async getAllBookings() {
    return this.repo.findAll();
  }

  async createBooking(input: CreateBookingInput) {
    const isDuplicate = await this.repo.checkDuplicate(input.email, input.date, input.time, input.experience);
    if (isDuplicate) {
      throw new AppError('DUPLICATE_BOOKING', 'A booking with these details already exists', 409);
    }

    const referenceId = generateReferenceId();
    const booking = await this.repo.create({ ...input, referenceId });

    await emailQueue.add('send-booking-confirmation', {
      customer: {
        name: `${input.firstName} ${input.lastName}`,
        email: input.email,
      },
      referenceId,
      experience: input.experience,
      date: input.date,
      time: input.time,
      location: input.location,
      therapist: input.therapist,
    });

    return {
      success: true,
      message: 'Booking request submitted successfully.',
      bookingReference: referenceId,
    };
  }
}
