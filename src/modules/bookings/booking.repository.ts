import { PrismaClient, BookingStatus } from '@prisma/client';
import { CreateBookingInput } from './booking.schema';
import { generateReferenceId } from '../../shared/response';

export class BookingRepository {
  constructor(private prisma: PrismaClient) {}

  async create(data: CreateBookingInput & { referenceId: string }) {
    return this.prisma.booking.create({
      data: {
        referenceId: data.referenceId,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        experience: data.experience,
        bookingDate: new Date(data.date),
        bookingTime: data.time,
        location: data.location,
        therapistPreference: data.therapist,
        notes: data.notes,
        status: BookingStatus.PENDING,
      },
    });
  }

  async findByReference(referenceId: string) {
    return this.prisma.booking.findUnique({ where: { referenceId } });
  }

  async checkDuplicate(email: string, date: string, time: string, experience: string): Promise<boolean> {
    const existing = await this.prisma.booking.findFirst({
      where: {
        email,
        bookingDate: new Date(date),
        bookingTime: time,
        experience,
        status: { not: BookingStatus.CANCELLED },
      },
    });
    return !!existing;
  }
}
