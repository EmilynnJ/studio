// server/index.js
require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const { PrismaClient } = require('@prisma/client');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const apiRoutes = require('./routes/api');
const { createSocketServer } = require('./socket');

const prisma = new PrismaClient();
const app = express();
const server = http.createServer(app);

// Configure CORS for both Express and Socket.IO
const corsOptions = {
  origin: process.env.CORS_ORIGIN || (process.env.NODE_ENV === 'production' 
    ? ['https://soulseer.com', 'https://www.soulseer.com'] 
    : ['http://localhost:3000']),
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json());

// Initialize Socket.IO with CORS settings
const io = new Server(server, {
  cors: corsOptions
});

// Set up socket server
createSocketServer(io, prisma);

// API routes
app.use('/api', apiRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Stripe webhook endpoint
app.post('/webhook/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SIGNING_SECRET;
  
  let event;
  
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error(`Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      console.log('PaymentIntent was successful:', paymentIntent.id);
      
      // If this payment is for a session, update the session record
      if (paymentIntent.metadata && paymentIntent.metadata.sessionId) {
        try {
          await prisma.session.update({
            where: { id: paymentIntent.metadata.sessionId },
            data: {
              status: 'COMPLETED',
              totalAmount: `${(paymentIntent.amount) / 100}`,
            },
          });
        } catch (error) {
          console.error('Error updating session:', error);
        }
      }
      break;
      
    case 'payment_method.attached':
      const paymentMethod = event.data.object;
      console.log('PaymentMethod was attached:', paymentMethod.id);
      break;
      
    case 'account.updated':
      const account = event.data.object;
      console.log('Stripe Connect account updated:', account.id);
      
      // If this is a reader's account that has been updated, update their status
      try {
        const user = await prisma.user.findFirst({
          where: { stripeAccountId: account.id }
        });
        
        if (user) {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              stripeAccountVerified: account.charges_enabled
            }
          });
        }
      } catch (error) {
        console.error('Error updating user stripe verification status:', error);
      }
      break;
      
    default:
      console.log(`Unhandled event type ${event.type}`);
  }
  
  res.status(200).json({ received: true });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start the server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});