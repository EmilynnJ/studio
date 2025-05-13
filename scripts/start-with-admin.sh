#!/bin/bash

# Start the application
echo "Starting SoulSeer application..."
npm run dev &
APP_PID=$!

# Wait for the application to start
echo "Waiting for application to start..."
sleep 10

# Initialize admin account
echo "Initializing admin account..."
node scripts/init-admin.js

# Keep the application running
wait $APP_PID
