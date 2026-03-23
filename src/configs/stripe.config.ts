import { registerAs } from '@nestjs/config';
export const stripeConfigFactory = registerAs('stripe', () => ({
  secretKey: process.env.STRIPE_SECRET_KEY,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  currency: 'inr',
}));
