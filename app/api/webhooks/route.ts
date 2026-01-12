import Stripe from 'stripe';
import { stripe } from '@/utils/stripe/config';

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature') as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  let event: Stripe.Event;

  try {
    if (!sig || !webhookSecret)
      return new Response('Webhook secret not found.', { status: 400 });
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    console.log(`🔔  Webhook received: ${event.type}`);
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.log(`❌ Error message: ${err.message}`);
      return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }
    return new Response('Unknown error occurred', { status: 400 });
  }

  // Always return success to Stripe if signature was verified
  return new Response(JSON.stringify({ received: true }));
}
