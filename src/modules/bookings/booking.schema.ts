import { z } from 'zod';
import { ALLOWED_EXPERIENCES, THERAPIST_PREFERENCES } from './booking.types';
import { sanitizeInput } from '../../utils/sanitize';

export const createBookingSchema = z.object({
  firstName: z.string()
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must be at most 50 characters')
    .transform(sanitizeInput),
  lastName: z.string()
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name must be at most 50 characters')
    .transform(sanitizeInput),
  email: z.string()
    .email('Please enter a valid email address')
    .transform((v) => v.toLowerCase().trim()),
  phone: z.string()
    .min(8, 'Phone number must be at least 8 digits')
    .max(20, 'Phone number too long')
    .transform((v) => v.replace(/\s+/g, '').trim()),
  experience: z.enum(ALLOWED_EXPERIENCES, {
    errorMap: () => ({ message: 'Please select a valid experience' }),
  }),
  date: z.string().refine((dateStr) => {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return date >= tomorrow;
  }, { message: 'Booking date must be tomorrow or later' }),
  time: z.string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Please select a valid time (HH:mm)'),
  location: z.string()
    .min(1, 'Location is required')
    .max(255, 'Location must be at most 255 characters')
    .transform(sanitizeInput),
  therapist: z.enum(THERAPIST_PREFERENCES, {
    errorMap: () => ({ message: 'Please select a valid therapist preference' }),
  }),
  notes: z.string()
    .max(1000, 'Notes must be at most 1000 characters')
    .transform(sanitizeInput)
    .optional(),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;