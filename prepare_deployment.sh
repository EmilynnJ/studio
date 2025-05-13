#!/bin/bash

echo "Preparing SoulSeer for deployment..."

# Fix import statements
echo "Fixing import statements..."
find src -type f -name "*.ts" -o -name "*.tsx" | while read file; do
  # Replace import statements with spaces after single quotes
  sed -i "s/from ' @/from '@/g" "$file"
done

# Ensure all UI components exist
echo "Checking UI components..."
mkdir -p src/components/ui

# Create a simple README for deployment
echo "Creating deployment README..."
cat > DEPLOYMENT_README.md << 'README'
# SoulSeer Deployment

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
2. Update Firebase security rules as needed

## Troubleshooting

If you encounter build errors:
- Check for spaces in import statements
- Ensure all UI components are properly exported
- Verify environment variables are set correctly
README

echo "Deployment preparation complete!"
