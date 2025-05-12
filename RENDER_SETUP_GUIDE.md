# SoulSeer Render.com Setup Guide

This guide provides step-by-step instructions for setting up and deploying the SoulSeer platform on Render.com.

## Step 1: Create a Neon PostgreSQL Database

1. Sign up for a Neon account at https://neon.tech/
2. Create a new project named "SoulSeer"
3. Create a new database named "soulseer"
4. Copy the connection string from the dashboard
5. Keep this connection string for later use

## Step 2: Fork or Clone the Repository

1. Fork or clone the SoulSeer repository to your GitHub account
2. Make sure all the required files are present:
   - `render.yaml` at the root level
   - Server code in the `server` directory
   - Frontend code in the `src` directory

## Step 3: Connect Your Repository to Render.com

1. Sign up for a Render.com account at https://render.com/
2. Click on "New" and select "Blueprint"
3. Connect your GitHub account
4. Select the repository containing the SoulSeer codebase
5. Render will detect the `render.yaml` file and show the services to be created
6. Review the services and click "Apply"

## Step 4: Update Environment Variables

After the initial deployment, you'll need to update the following environment variables:

### For the `soulseer-signaling` service:

1. Go to the service dashboard in Render.com
2. Click on "Environment" tab
3. Update the `DATABASE_URL` variable with your Neon PostgreSQL connection string:
   ```
   DATABASE_URL=postgres://[your-neon-connection-string]
   ```
4. Click "Save Changes"

### For the `soulseer-frontend` service:

1. Verify that `NEXT_PUBLIC_SIGNALING_SERVER_URL` is automatically set to your signaling server URL
2. If not, manually set it to the URL of your signaling server:
   ```
   NEXT_PUBLIC_SIGNALING_SERVER_URL=https://soulseer-signaling.onrender.com
   ```

## Step 5: Run Database Migrations

1. Go to the "Shell" tab of your `soulseer-signaling` service in Render.com
2. Run the following commands:
   ```bash
   cd server
   npx prisma migrate deploy
   ```

## Step 6: Create an Admin User

1. Go to the Firebase Console at https://console.firebase.google.com/
2. Select your project "soulseer-2c4ed"
3. Go to "Authentication" > "Users"
4. Click "Add User" and create a new user with your email and a password
5. Copy the UID of the newly created user
6. Go to "Firestore Database" and create a new collection called "users" if it doesn't exist
7. Add a new document with the UID as the document ID
8. Add the following fields:
   ```
   {
     "uid": "[your-user-uid]",
     "email": "[your-email]",
     "name": "Admin User",
     "role": "admin",
     "createdAt": [server timestamp]
   }
   ```

## Step 7: Set Up Stripe Webhook

1. Go to the Stripe Dashboard at https://dashboard.stripe.com/
2. Navigate to "Developers" > "Webhooks"
3. Click "Add endpoint"
4. Enter your webhook URL: `https://soulseer-signaling.onrender.com/webhook/stripe`
5. Select the following events:
   - `payment_intent.succeeded`
   - `payment_intent.failed`
   - `account.updated`
6. Click "Add endpoint"
7. Copy the "Signing secret" and update the `STRIPE_WEBHOOK_SIGNING_SECRET` environment variable in Render.com

## Step 8: Test the Deployment

1. Visit your frontend URL (e.g., `https://soulseer-frontend.onrender.com`)
2. Log in with the admin credentials you created
3. Navigate to the admin dashboard
4. Try creating a reader account
5. Test the WebRTC functionality by starting a session

## Troubleshooting

### Common Issues and Solutions

#### Frontend Can't Connect to Signaling Server

**Problem**: The frontend can't establish a connection to the signaling server.

**Solution**:
1. Check that the `NEXT_PUBLIC_SIGNALING_SERVER_URL` environment variable is correctly set
2. Verify that the signaling server is running by checking its logs
3. Ensure CORS is properly configured in the signaling server

#### Database Connection Errors

**Problem**: The server can't connect to the Neon PostgreSQL database.

**Solution**:
1. Verify the `DATABASE_URL` environment variable is correctly set
2. Check that your IP is allowed in Neon's connection settings
3. Try connecting to the database using a PostgreSQL client to verify credentials

#### Stripe Webhook Errors

**Problem**: Stripe webhooks are not being received or processed.

**Solution**:
1. Check that the webhook signing secret is correctly set
2. Verify that the webhook URL is accessible from the internet
3. Use the Stripe CLI to test webhook delivery

#### WebRTC Connection Issues

**Problem**: Users can't establish WebRTC connections.

**Solution**:
1. Check browser console for errors
2. Verify that the STUN/TURN servers are correctly configured
3. Ensure that the signaling server is properly handling WebRTC signaling messages

## Monitoring and Scaling

### Monitoring

1. Set up Render.com alerts for service health
2. Use the Render.com logs to monitor application activity
3. Consider integrating with a monitoring service like Datadog or New Relic

### Scaling

1. Upgrade to paid plans for production use:
   - Use "Standard" plan for both frontend and signaling server
   - Consider using a dedicated instance for the signaling server
2. Set up auto-scaling for the signaling server if you expect high traffic
3. Consider using a Redis instance for scaling WebSocket connections across multiple instances

## Security Considerations

1. Ensure all API endpoints are properly authenticated
2. Use HTTPS for all communications
3. Regularly rotate API keys and secrets
4. Implement rate limiting for API endpoints
5. Set up proper CORS configuration
6. Use secure WebRTC configurations with TURN servers for NAT traversal