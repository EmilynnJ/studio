import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';

export const config = {
  api: {
    bodyParser: false,
  },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2022-11-15',
});
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

export async function POST(request: Request) {
  const payload = await request.text();
  const signature = request.headers.get('stripe-signature') || '';
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, endpointSecret);
  } catch (err: any) {
    console.error('⚠️ Webhook signature verification failed.', err.message);
    return NextResponse.json(
      { error: 'Webhook signature verification failed.' },
      { status: 400 }
    );
  }

  switch (event.type) {
    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice;
      const sessionId = invoice.metadata.sessionId;
      if (sessionId) {
        try {
          await prisma.session.update({
            where: { id: sessionId },
            data: {
              status: 'COMPLETED',
              totalAmount: `${(invoice.amount_paid ?? 0) / 100}`,
            },
          });
        } catch (updateErr: any) {
          console.error(
            `Error updating session ${sessionId} on invoice.payment_succeeded:`,
            updateErr
          );
        }
      } else {
        console.warn(
          '⚠️ No sessionId metadata found on invoice',
          invoice.id
        );
      }
      break;
    }

    case 'charge.failed': {
      const charge = event.data.object as Stripe.Charge;
      const sessionId = charge.metadata.sessionId;
      if (sessionId) {
        try {
          await prisma.session.update({
            where: { id: sessionId },
            data: { status: 'CANCELLED' },
          });
        } catch (updateErr: any) {
          console.error(
            `Error updating session ${sessionId} on charge.failed:`,
            updateErr
          );
        }
      } else {
        console.warn(
          '⚠️ No sessionId metadata found on charge',
          charge.id
        );
      }
      break;
    }

    default:
      // Ignore other event types
      break;
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
