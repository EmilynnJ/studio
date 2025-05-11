import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import prisma from '@/lib/prisma';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2022-11-15',
});

export async function POST(request: Request) {
  try {
    const { clientId, sessionId, amount } = await request.json();

    if (!clientId || !sessionId || !amount) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Fetch the session to get the reader ID
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { reader: true }
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Get the reader's Stripe account ID
    const readerStripeAccountId = session.reader.stripeAccountId;

    if (!readerStripeAccountId) {
      return NextResponse.json({ error: 'Reader does not have a Stripe account connected' }, { status: 400 });
    }

    // Create a PaymentIntent with transfer_data to reader's account
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      customer: clientId, // Assuming clientId maps to Stripe customer ID
      payment_method_types: ['card'],
      description: `Charge for session ${sessionId}`,
      transfer_data: {
        destination: readerStripeAccountId,
      },
      confirm: true,
      off_session: true,
    });

    return NextResponse.json({ success: true, paymentIntentId: paymentIntent.id });
  } catch (error: any) {
    console.error('Stripe charge error:', error);
    return NextResponse.json({ error: error.message || 'Stripe charge failed' }, { status: 500 });
  }
}
