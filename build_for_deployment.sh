#!/bin/bash

echo "Preparing SoulSeer for deployment..."

# Fix import statements
echo "Fixing import statements..."
find src -type f -name "*.ts" -o -name "*.tsx" | while read file; do
  # Replace import statements with spaces after single quotes
  sed -i "s/from ' @/from '@/g" "$file"
done

# Create a package for deployment
echo "Creating deployment package..."
mkdir -p deploy_package
cp -r src deploy_package/
cp -r public deploy_package/
cp package.json package-lock.json tsconfig.json next.config.js deploy_package/
cp .env deploy_package/.env.local
cp render.yaml deploy_package/

echo "Deployment package created in 'deploy_package' directory."
echo "Upload this directory to your Render project."
