import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { clientId, amount, sessionId, transfer_data } = body;
    
    if (!clientId || !amount || !sessionId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }
    
    // Get client from database
    const client = await prisma.user.findUnique({
      where: { id: clientId },
      select: {
        stripeCustomerId: true,
        balance: true
      }
    });
    
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }
    
    if (!client.stripeCustomerId) {
      return NextResponse.json({ error: 'Client does not have a payment method' }, { status: 400 });
    }
    
    // Check if client has sufficient balance
    if (client.balance < amount / 100) { // Convert cents to dollars
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }
    
    // Create a payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      customer: client.stripeCustomerId,
      transfer_data,
      transfer_group: sessionId,
      metadata: {
        sessionId,
        clientId
      },
      confirm: true,
      off_session: true
    });
    
    // Update client balance
    await prisma.user.update({
      where: { id: clientId },
      data: {
        balance: {
          decrement: amount / 100 // Convert cents to dollars
        }
      }
    });
    
    // Record the transaction
    await prisma.transaction.create({
      data: {
        userId: clientId,
        amount: (amount / 100).toString(), // Convert cents to dollars
        type: 'CHARGE',
        status: 'COMPLETED',
        sessionId,
        stripePaymentIntentId: paymentIntent.id
      }
    });
    
    return NextResponse.json({
      success: true,
      paymentIntentId: paymentIntent.id
    });
  } catch (error: any) {
    console.error('Error processing payment:', error);
    
    // Handle Stripe errors
    if (error.type === 'StripeCardError') {
      return NextResponse.json({ 
        error: error.message || 'Your card was declined' 
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      error: 'Payment processing failed' 
    }, { status: 500 });
  }
}