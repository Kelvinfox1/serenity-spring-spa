import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';

describe('POST /api/v1/bookings', () => {
  const validPayload = {
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane@example.com',
    phone: '+1234567890',
    experience: 'Signature Elite Massage (90 min)',
    date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    time: '14:00',
    location: 'Main Spa',
    therapist: 'No Preference',
  };

  it('should create a booking and return reference', async () => {
    const res = await request(app)
      .post('/api/v1/bookings')
      .send(validPayload)
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.bookingReference).toMatch(/^SPA-\d{4}-[A-Z0-9]{6}$/);
  });

  it('should reject past date', async () => {
    const res = await request(app)
      .post('/api/v1/bookings')
      .send({ ...validPayload, date: '2020-01-01' })
      .expect(400);

    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should reject invalid experience', async () => {
    const res = await request(app)
      .post('/api/v1/bookings')
      .send({ ...validPayload, experience: 'Fake Treatment' })
      .expect(400);

    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should sanitize HTML in firstName', async () => {
    const res = await request(app)
      .post('/api/v1/bookings')
      .send({ ...validPayload, firstName: '<b>Jane</b>' })
      .expect(201);

    expect(res.body.bookingReference).toBeDefined();
  });
});
