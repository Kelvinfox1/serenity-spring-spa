import { z } from 'zod';
import { ALLOWED_EXPERIENCES, THERAPIST_PREFERENCES } from './booking.types';
import { sanitizeInput } from '../../utils/sanitize';

export const createBookingSchema = z.object({
  firstName: z.string().min(2).max(50).transform(sanitizeInput),
  lastName: z.string().min(2).max(50).transform(sanitizeInput),
  email: z.string().email().transform((v) => v.toLowerCase().trim()),
  phone: z.string().min(8).max(20).transform((v) => v.replace(/\s+/g, '').trim()),
  experience: z.enum(ALLOWED_EXPERIENCES),
  date: z.string().refine((dateStr) => {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return date >= tomorrow;
  }, { message: 'Booking date must be tomorrow or later' }),
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:mm)'),
  location: z.string().min(1).max(255).transform(sanitizeInput),
  therapist: z.enum(THERAPIST_PREFERENCES),
  notes: z.string().max(1000).transform(sanitizeInput).optional(),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
