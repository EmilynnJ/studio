// server/services/billingService.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { firestore } = require('../firebase-admin');

class BillingService {
  constructor(prisma) {
    this.prisma = prisma;
    this.activeSessions = new Map(); // Track active billing sessions
  }

  // Initialize a billing session
  async initializeBilling(sessionId, readerId, clientId, ratePerMinute) {
    try {
      // Get reader's Stripe account ID
      const reader = await this.prisma.user.findUnique({
        where: { id: readerId },
        select: { stripeAccountId: true }
      });

      if (!reader || !reader.stripeAccountId) {
        throw new Error('Reader does not have a valid Stripe account');
      }

      // Get client's payment method
      const client = await this.prisma.user.findUnique({
        where: { id: clientId },
        select: { stripeCustomerId: true, balance: true }
      });

      if (!client || !client.stripeCustomerId) {
        throw new Error('Client does not have a valid payment method');
      }

      // Check if client has sufficient balance
      if (client.balance < ratePerMinute) {
        throw new Error('Insufficient balance to start session');
      }

      // Create a billing session
      this.activeSessions.set(sessionId, {
        readerId,
        clientId,
        readerStripeAccountId: reader.stripeAccountId,
        clientStripeCustomerId: client.stripeCustomerId,
        ratePerMinute,
        startTime: null,
        endTime: null,
        isPaused: false,
        totalBilled: 0,
        totalMinutes: 0,
        lastBillingTime: null,
        billingInterval: null
      });

      return { success: true, sessionId };
    } catch (error) {
      console.error('Error initializing billing:', error);
      return { success: false, error: error.message };
    }
  }

  // Start billing for a session
  async startBilling(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    const startTime = new Date();
    session.startTime = startTime;
    session.lastBillingTime = startTime;
    session.isPaused = false;

    // Set up interval to bill every minute
    const BILLING_INTERVAL = 60000; // 60 seconds
    session.billingInterval = setInterval(async () => {
      if (session.isPaused) return;

      try {
        await this.processBillingCycle(sessionId);
      } catch (error) {
        console.error('Error processing billing cycle:', error);
        this.pauseBilling(sessionId);
      }
    }, BILLING_INTERVAL);

    // Update session in Firestore
    await firestore.collection('videoSessions').doc(sessionId).update({
      billingStarted: true,
      billingStartTime: startTime
    });

    return { success: true, startTime };
  }

  // Process a single billing cycle
  async processBillingCycle(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    // Calculate amount to charge (rate per minute)
    const amountToCharge = Math.round(session.ratePerMinute * 100); // Convert to cents

    try {
      // Create a payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountToCharge,
        currency: 'usd',
        customer: session.clientStripeCustomerId,
        transfer_data: {
          destination: session.readerStripeAccountId,
        },
        transfer_group: sessionId,
        metadata: {
          sessionId,
          readerId: session.readerId,
          clientId: session.clientId,
          billingCycle: session.totalMinutes + 1
        },
        confirm: true,
        off_session: true
      });

      // Update session billing info
      session.totalBilled += session.ratePerMinute;
      session.totalMinutes += 1;
      session.lastBillingTime = new Date();

      // Update client balance in database
      await this.prisma.user.update({
        where: { id: session.clientId },
        data: {
          balance: {
            decrement: session.ratePerMinute
          }
        }
      });

      // Update reader earnings in database
      await this.prisma.user.update({
        where: { id: session.readerId },
        data: {
          earnings: {
            increment: session.ratePerMinute * 0.7 // 70% to reader
          }
        }
      });

      // Update session in Firestore
      await firestore.collection('videoSessions').doc(sessionId).update({
        totalBilled: session.totalBilled,
        totalMinutes: session.totalMinutes,
        lastBillingTime: session.lastBillingTime
      });

      // Check if client has sufficient balance for next cycle
      const client = await this.prisma.user.findUnique({
        where: { id: session.clientId },
        select: { balance: true }
      });

      if (client.balance < session.ratePerMinute) {
        // End session due to insufficient funds
        await this.endBilling(sessionId, 'insufficient_funds');
        return { success: false, error: 'Insufficient funds' };
      }

      return { success: true, amountCharged: session.ratePerMinute };
    } catch (error) {
      console.error('Error processing payment:', error);
      
      // If payment fails, pause billing and notify
      this.pauseBilling(sessionId);
      return { success: false, error: error.message };
    }
  }

  // Pause billing for a session
  pauseBilling(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    session.isPaused = true;
    
    // Update session in Firestore
    firestore.collection('videoSessions').doc(sessionId).update({
      billingPaused: true,
      billingPausedAt: new Date()
    });

    return { success: true };
  }

  // Resume billing for a session
  resumeBilling(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    session.isPaused = false;
    session.lastBillingTime = new Date();
    
    // Update session in Firestore
    firestore.collection('videoSessions').doc(sessionId).update({
      billingPaused: false,
      billingResumedAt: new Date()
    });

    return { success: true };
  }

  // End billing for a session
  async endBilling(sessionId, reason = 'user_ended') {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    // Clear billing interval
    if (session.billingInterval) {
      clearInterval(session.billingInterval);
    }

    const endTime = new Date();
    session.endTime = endTime;
    
    // Calculate final stats
    const durationMs = endTime.getTime() - session.startTime.getTime();
    const durationMinutes = Math.ceil(durationMs / 60000);
    
    // Process any remaining partial minute if needed
    const timeSinceLastBilling = endTime.getTime() - session.lastBillingTime.getTime();
    if (timeSinceLastBilling > 30000 && !session.isPaused) { // If more than 30 seconds since last billing
      try {
        await this.processBillingCycle(sessionId);
      } catch (error) {
        console.error('Error processing final billing cycle:', error);
      }
    }
    
    // Update session in Firestore
    await firestore.collection('videoSessions').doc(sessionId).update({
      billingEnded: true,
      billingEndTime: endTime,
      totalBilled: session.totalBilled,
      totalMinutes: session.totalMinutes,
      endReason: reason
    });
    
    // Clean up
    this.activeSessions.delete(sessionId);
    
    return { 
      success: true, 
      endTime, 
      totalBilled: session.totalBilled, 
      totalMinutes: session.totalMinutes,
      reason
    };
  }

  // Get current billing status for a session
  getBillingStatus(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return { success: false, error: 'Session not found' };
    }
    
    return {
      success: true,
      readerId: session.readerId,
      clientId: session.clientId,
      ratePerMinute: session.ratePerMinute,
      startTime: session.startTime,
      isPaused: session.isPaused,
      totalBilled: session.totalBilled,
      totalMinutes: session.totalMinutes,
      lastBillingTime: session.lastBillingTime
    };
  }
}

module.exports = BillingService;