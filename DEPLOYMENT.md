# SoulSeer Deployment Guide

This document provides instructions for deploying the SoulSeer platform to production environments.

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (or Neon account)
- Firebase project with Authentication, Firestore, and Storage enabled
- Stripe account with Connect enabled
- TURN server for WebRTC NAT traversal (recommended for production)

## Environment Variables

Before deploying, ensure all required environment variables are set:

### Frontend Environment Variables

```
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your-project-id.firebaseio.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your-measurement-id

# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=your-stripe-public-key

# WebRTC Configuration
NEXT_PUBLIC_SIGNALING_SERVER_URL=https://your-signaling-server-url
NEXT_PUBLIC_WEBRTC_ICE_SERVERS=[{"urls":"stun:stun.l.google.com:19302"},{"urls":"stun:stun1.l.google.com:19302"}]
NEXT_PUBLIC_WEBRTC_TURN_SERVERS=[{"urls":"turn:your-turn-server.com:3478","username":"username","credential":"password"}]
```

### Backend Environment Variables

```
# Application
NODE_ENV=production
PORT=3001

# Firebase Configuration
FIREBASE_SERVICE_ACCOUNT_KEY=base64-encoded-service-account-key
FIREBASE_DATABASE_URL=https://your-project-id.firebaseio.com
FIREBASE_DATABASE_SECRET=your-database-secret

# Stripe Configuration
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_WEBHOOK_SIGNING_SECRET=your-stripe-webhook-signing-secret

# Database Configuration
DATABASE_URL=postgres://your-neon-db-connection-string

# WebRTC Configuration
WEBRTC_ICE_SERVERS=[{"urls":"stun:stun.l.google.com:19302"},{"urls":"stun:stun1.l.google.com:19302"}]
WEBRTC_TURN_SERVERS=[{"urls":"turn:your-turn-server.com:3478","username":"username","credential":"password"}]

# CORS Configuration
CORS_ORIGIN=https://your-frontend-domain.com
```

## Deployment Options

### Option 1: Render.com

1. Connect your GitHub repository to Render.com
2. Use the `render.yaml` file in the repository for deployment configuration
3. Set all required environment variables in the Render dashboard
4. Deploy both the frontend and signaling server services

### Option 2: Docker

1. Build and run the application using Docker Compose:
   ```
   docker-compose up -d
   ```

2. Ensure all environment variables are set in a `.env` file or in your environment

### Option 3: Manual Deployment

#### Frontend (Next.js)

1. Build the frontend:
   ```
   npm ci
   npm run build
   ```

2. Start the frontend server:
   ```
   npm start
   ```

#### Backend (Signaling Server)

1. Install dependencies:
   ```
   cd server
   npm ci
   ```

2. Start the server:
   ```
   node index.js
   ```

## Database Setup

1. Set up your PostgreSQL database (or Neon database)
2. Run Prisma migrations:
   ```
   npx prisma migrate deploy
   ```

## Stripe Configuration

1. Set up Stripe Connect for reader payouts
2. Configure Stripe webhooks to point to your backend endpoint:
   ```
   https://your-backend-url/webhook/stripe
   ```

## Firebase Configuration

1. Set up Firebase Authentication with email/password provider
2. Configure Firestore security rules
3. Set up Firebase Storage for reader profile images

## WebRTC TURN Server

For production environments, it's recommended to set up a TURN server to handle NAT traversal for WebRTC connections. You can use services like:

- Twilio Network Traversal Service
- CoTURN (self-hosted)
- Xirsys

## Monitoring and Scaling

- Set up logging with a service like Datadog or Loggly
- Configure monitoring for server health
- For high traffic, consider scaling the signaling server horizontally behind a load balancer

## Security Considerations

- Ensure all API endpoints are properly authenticated
- Use HTTPS for all communications
- Regularly rotate API keys and secrets
- Implement rate limiting for API endpoints
- Set up proper CORS configuration

## Troubleshooting

- Check server logs for errors
- Verify WebRTC connections using browser developer tools
- Test Stripe webhooks using the Stripe CLI
- Ensure Firebase permissions are correctly configured