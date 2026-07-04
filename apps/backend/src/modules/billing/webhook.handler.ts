import { Request, Response, NextFunction } from 'express';
import Stripe from 'stripe';
import { env } from '../../config/env';
import { usersRepo } from '@sd-os/db';
import { logger } from '../../utils/logger';

const stripe = env.STRIPE_SECRET_KEY ? new Stripe(env.STRIPE_SECRET_KEY) : null;

export async function handleStripeWebhook(req: Request, res: Response, next: NextFunction) {
  if (!stripe || !env.STRIPE_WEBHOOK_SECRET) {
    logger.error('Stripe not configured — webhook secret missing');
    return res.status(503).json({ success: false, error: 'Billing not configured' });
  }

  const sig = req.headers['stripe-signature'];
  if (!sig) {
    logger.warn('Missing Stripe-Signature header');
    return res.status(400).json({ success: false, error: 'Missing signature' });
  }

  const rawBody = (req as any).rawBody;
  if (!rawBody) {
    logger.error('Raw body not available for Stripe signature verification');
    return res.status(400).json({ success: false, error: 'Raw body required' });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    logger.error({ err }, 'Stripe webhook signature verification failed');
    return res.status(400).json({ success: false, error: 'Invalid signature' });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        if (userId) {
          await usersRepo.update(userId, { role: 'PRO' });
          logger.info({ userId }, 'User upgraded to PRO via Stripe webhook');
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;
        if (userId) {
          await usersRepo.update(userId, { role: 'USER' });
          logger.info({ userId }, 'User subscription canceled via Stripe webhook');
        }
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const userId = invoice.metadata?.userId;
        if (userId) {
          logger.warn({ userId }, 'Payment failed for user');
        }
        break;
      }
      default:
        logger.debug({ type: event.type }, 'Unhandled Stripe webhook event');
    }
    res.json({ received: true });
  } catch (err) {
    logger.error({ err, eventType: event.type }, 'Error processing Stripe webhook');
    next(err);
  }
}

export function stripeWebhookRawBodyMiddleware(req: Request, _res: Response, next: NextFunction) {
  if (req.path === '/webhook' || req.path === '/webhook/') {
    (req as any).rawBody = req.body;
  }
  next();
}