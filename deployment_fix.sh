#!/bin/bash

echo "SoulSeer Deployment Fix Script"
echo "============================="
echo

# Create a ZIP file of the project for deployment
echo "Creating deployment package..."
mkdir -p deploy
cp -r src deploy/
cp -r public deploy/
cp package.json package-lock.json tsconfig.json next.config.ts deploy/
cp .env deploy/.env.local

# Create a README for deployment
cat > deploy/README.md << 'README'
# SoulSeer Deployment Package

This package contains a fixed version of the SoulSeer application for deployment.

## Setup Instructions

1. Upload this package to your Render project
2. Set all required environment variables in the Render dashboard
3. Deploy the application

## Admin Setup

After deployment:
1. Access `/admin-setup.html` to set up the admin account
2. Log in with your admin credentials
README

echo "Deployment package created in the 'deploy' directory."
echo "Upload this directory to your Render project."
echo
echo "IMPORTANT: Make sure to set all environment variables in the Render dashboard."
