import { Worker } from 'bullmq';
import { sendEmail } from '../utils/email';
import { env } from '../config/env';
import { logger } from '../shared/logger';

interface EmailJobData {
  customer: { name: string; email: string };
  referenceId: string;
  experience: string;
  date: string;
  time: string;
  location: string;
  therapist: string;
}

const worker = new Worker<EmailJobData>(
  'email-queue',
  async (job) => {
    const data = job.data;
    // Customer email
    await sendEmail({
      to: data.customer.email,
      subject: `Booking Confirmation - ${data.referenceId}`,
      html: `
        <div style="font-family: Georgia, serif; max-width: 600px; margin: auto;">
          <h2 style="color: #b08d57;">Thank you for your booking</h2>
          <p>Dear ${data.customer.name},</p>
          <p>Your luxury spa experience has been received. Our concierge will contact you within <strong>2 hours</strong> to confirm your appointment.</p>
          <table style="width:100%; margin:20px 0;">
            <tr><td><strong>Reference</strong></td><td>${data.referenceId}</td></tr>
            <tr><td><strong>Experience</strong></td><td>${data.experience}</td></tr>
            <tr><td><strong>Date</strong></td><td>${data.date}</td></tr>
            <tr><td><strong>Time</strong></td><td>${data.time}</td></tr>
            <tr><td><strong>Location</strong></td><td>${data.location}</td></tr>
            <tr><td><strong>Therapist</strong></td><td>${data.therapist}</td></tr>
          </table>
          <p style="color:#555;">With elegance,<br/>The Spa Concierge</p>
        </div>
      `,
    });

    // Admin notification
    if (env.EMAIL_ADMIN) {
      await sendEmail({
        to: env.EMAIL_ADMIN,
        subject: `New Booking - ${data.referenceId}`,
        html: `
          <h2>New Booking Request</h2>
          <p>Customer: ${data.customer.name} (${data.customer.email})</p>
          <p>Reference: ${data.referenceId}</p>
          <p>Experience: ${data.experience}</p>
          <p>Date: ${data.date} at ${data.time}</p>
          <p>Location: ${data.location}</p>
        `,
      });
    }
  },
  { connection: { url: env.REDIS_URL } }
);

worker.on('completed', (job) => logger.info(`Email job ${job.id} completed`));
worker.on('failed', (job, err) => logger.error(`Email job ${job?.id} failed: ${err.message}`));
