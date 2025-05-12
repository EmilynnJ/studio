# SoulSeer Deployment Guide for Render

This guide explains how to deploy the SoulSeer application on Render.

## Prerequisites

1. A Render account (https://render.com)
2. A Firebase project with Firestore and Authentication enabled
3. A Stripe account with API keys
4. A Neon PostgreSQL database or equivalent

## Environment Variables

The following environment variables need to be set in your Render dashboard:

### Frontend (Next.js) Environment Variables

```
NODE_ENV=production
NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your-project-id-default-rtdb.firebaseio.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your-measurement-id
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=pk_live_your-stripe-public-key
NEXT_PUBLIC_WEBRTC_ICE_SERVERS=[{"urls":"stun:stun.l.google.com:19302"},{"urls":"stun:stun1.l.google.com:19302"}]
NEXT_PUBLIC_WEBRTC_TURN_SERVERS=[{"urls":"turn:your-turn-server.com:3478","username":"username","credential":"password"}]
```

### Backend (Signaling Server) Environment Variables

```
NODE_ENV=production
PORT=3001
FIREBASE_API_KEY=your-firebase-api-key
FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
FIREBASE_DATABASE_URL=https://your-project-id-default-rtdb.firebaseio.com
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your-sender-id
FIREBASE_APP_ID=your-app-id
FIREBASE_MEASUREMENT_ID=your-measurement-id
FIREBASE_SERVICE_ACCOUNT_KEY=your-base64-encoded-service-account-json
STRIPE_SECRET_KEY=sk_live_your-stripe-secret-key
STRIPE_WEBHOOK_SIGNING_SECRET=whsec_your-webhook-signing-secret
DATABASE_URL=postgres://your-neon-db-connection-string
SESSION_SECRET=your-session-secret
LOG_LEVEL=info
```

## Firebase Service Account

For the `FIREBASE_SERVICE_ACCOUNT_KEY` environment variable, you need to:

1. Go to your Firebase project settings
2. Navigate to "Service accounts"
3. Click "Generate new private key"
4. Download the JSON file
5. Base64 encode the entire JSON file:
   ```
   cat firebase-service-account.json | base64
   ```
6. Use the resulting string as the value for `FIREBASE_SERVICE_ACCOUNT_KEY`

## Database Setup

1. Create a PostgreSQL database on Neon or another provider
2. Run the database migrations:
   ```
   npx prisma migrate deploy
   ```

## Deployment Steps

1. Fork this repository to your GitHub account
2. Connect your GitHub repository to Render
3. Create a new Web Service for the frontend:
   - Build Command: `npm ci && npm run build`
   - Start Command: `npm start`
   - Set all required environment variables
4. Create a new Web Service for the backend:
   - Build Command: `cd server && npm ci`
   - Start Command: `cd server && node index.js`
   - Set all required environment variables
5. Deploy both services

## Automatic Deployment with render.yaml

Alternatively, you can use the `render.yaml` file in this repository to deploy both services at once:

1. Fork this repository
2. Go to your Render dashboard
3. Click "New" > "Blueprint"
4. Connect your GitHub repository
5. Set all required environment variables
6. Click "Apply"

## Troubleshooting

If you encounter any issues during deployment:

1. Check the logs in your Render dashboard
2. Verify all environment variables are set correctly
3. Ensure your Firebase service account has the necessary permissions
4. Check that your database connection string is correct
5. Verify your Stripe API keys are valid