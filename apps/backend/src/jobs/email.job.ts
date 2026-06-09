import { Worker } from 'bullmq';
import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../utils/logger';

// Setup mail transporter if SMTP configurations are present
let transporter: nodemailer.Transporter | null = null;
if (env.SMTP_HOST && env.SMTP_PORT && env.SMTP_USER && env.SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });
  logger.info('SMTP mail transporter initialized successfully.');
} else {
  logger.info('SMTP host parameters not fully specified. Transactional emails will log to the console.');
}

const worker = new Worker('emails', async (job) => {
  const { to, subject, type, token, name } = job.data as {
    to: string;
    subject: string;
    type: 'verification' | 'reset-password';
    token: string;
    name?: string;
  };

  const url = type === 'verification'
    ? `${env.FRONTEND_URL}/verify-email?token=${token}`
    : `${env.FRONTEND_URL}/reset-password?token=${token}`;

  let htmlContent = '';
  if (type === 'verification') {
    htmlContent = `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; background-color: #09090b; color: #f4f4f5; border: 1px solid #27272a; border-radius: 8px;">
        <h2 style="color: #6366f1;">Welcome to System Design OS!</h2>
        <p>Hi ${name || 'there'},</p>
        <p>Thank you for registering. Please click the button below to verify your email address and activate your account:</p>
        <div style="margin: 30px 0;">
          <a href="${url}" style="background-color: #4f46e5; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Verify Email Address</a>
        </div>
        <p style="font-size: 12px; color: #a1a1aa;">If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="font-size: 12px; color: #6366f1; word-break: break-all;">${url}</p>
        <p style="font-size: 12px; color: #a1a1aa; border-top: 1px solid #27272a; padding-top: 15px; margin-top: 20px;">This link will expire in 24 hours. If you did not sign up for this account, you can safely ignore this email.</p>
      </div>
    `;
  } else {
    htmlContent = `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; background-color: #09090b; color: #f4f4f5; border: 1px solid #27272a; border-radius: 8px;">
        <h2 style="color: #6366f1;">Reset Your Password</h2>
        <p>Hi ${name || 'there'},</p>
        <p>We received a request to reset your password. Click the button below to set a new password:</p>
        <div style="margin: 30px 0;">
          <a href="${url}" style="background-color: #4f46e5; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
        </div>
        <p style="font-size: 12px; color: #a1a1aa;">If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="font-size: 12px; color: #6366f1; word-break: break-all;">${url}</p>
        <p style="font-size: 12px; color: #a1a1aa; border-top: 1px solid #27272a; padding-top: 15px; margin-top: 20px;">This link will expire in 1 hour. If you did not request a password reset, please secure your account.</p>
      </div>
    `;
  }

  if (transporter) {
    try {
      await transporter.sendMail({
        from: env.EMAIL_FROM,
        to,
        subject,
        html: htmlContent,
      });
      logger.info({ to, type }, 'Transactional email successfully sent.');
    } catch (err) {
      logger.error({ err, to, type }, 'Failed to send transactional email.');
      throw err;
    }
  } else {
    logger.info(
      { to, type, url },
      `\n======================================================\n[EMAIL SIMULATION] SMTP not configured. Details:\nTo: ${to}\nSubject: ${subject}\nLink: ${url}\n======================================================\n`
    );
  }
}, {
  connection: { url: env.REDIS_URL }
});

export default worker;
