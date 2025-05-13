#!/bin/bash

echo "SoulSeer Direct Deployment Script"
echo "================================"
echo

# Create a deployment directory
rm -rf direct_deploy
mkdir -p direct_deploy

# Copy essential files
echo "Copying essential files..."
cp -r src direct_deploy/
cp -r public direct_deploy/
cp package.json package-lock.json tsconfig.json next.config.ts direct_deploy/
cp .env direct_deploy/.env.local
cp render.yaml direct_deploy/

# Create a README for deployment
cat > direct_deploy/DEPLOY_INSTRUCTIONS.md << 'README'
# SoulSeer Deployment Instructions

## Setup

1. Upload all files to your Render project
2. Set all required environment variables in the Render dashboard
3. Deploy the application

## Environment Variables

Make sure to set these environment variables in your Render dashboard:

- FIREBASE_API_KEY
- FIREBASE_AUTH_DOMAIN
- FIREBASE_DATABASE_URL
- FIREBASE_PROJECT_ID
- FIREBASE_STORAGE_BUCKET
- FIREBASE_MESSAGING_SENDER_ID
- FIREBASE_APP_ID
- FIREBASE_MEASUREMENT_ID
- STRIPE_PUBLIC_KEY
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SIGNING_SECRET
- SESSION_SECRET
- ADMIN_EMAIL
- ADMIN_PASSWORD

## Admin Setup

After deployment:
1. Access `/admin-setup.html` to set up the admin account
2. Log in with your admin credentials
README

echo "Direct deployment package created in the 'direct_deploy' directory."
echo "Upload the contents of this directory to your Render project."
echo
echo "IMPORTANT: Make sure to set all environment variables in the Render dashboard."
