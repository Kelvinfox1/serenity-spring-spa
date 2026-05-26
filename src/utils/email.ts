import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../shared/logger';

const transporter = env.SMTP_HOST
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: false,
      auth: env.SMTP_USER
        ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
        : undefined,
    })
  : null;

export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  if (!transporter || env.NODE_ENV === 'test') {
    logger.info('Email sending skipped (no transport or test env)');
    return;
  }
  await transporter.sendMail({
    from: env.EMAIL_FROM,
    to,
    subject,
    html,
  });
}
