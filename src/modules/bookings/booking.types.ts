export const ALLOWED_EXPERIENCES = [
  'Signature Elite Massage (90 min)',
  'Deep Tissue Recovery (75 min)',
  'Executive Stress Reset (60 min)',
  'Royal Full Body Ritual (120 min)',
  'Couples Serenity Ritual (90 min)',
  'Luxury Hotel Spa Experience',
  'Home Wellness Therapy',
  'Microblading Artistry (120 min)',
  'Cateye Hybrid Lashes (90 min)',
  'Volume Lash Experience (120 min)',
  'Brazilian Luxury Waxing (45 min)',
] as const;

export type Experience = (typeof ALLOWED_EXPERIENCES)[number];

export const THERAPIST_PREFERENCES = [
  'No Preference',
  'Senior Specialist',
  'Female Therapist',
  'Male Therapist',
  'Specific Therapist (Note Below)',
] as const;

export type TherapistPreference = (typeof THERAPIST_PREFERENCES)[number];

export interface BookingRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  experience: Experience;
  date: string;
  time: string;
  location: string;
  therapist: TherapistPreference;
  notes?: string;
}

export interface BookingResponse {
  success: boolean;
  message: string;
  bookingReference: string;
}
