# SoulSeer Deployment

This is the deployment package for SoulSeer.

## Deployment Instructions

1. Make sure all environment variables are set in the Render dashboard:
   - Firebase configuration
   - Stripe keys
   - WebRTC configuration

2. The build command should be: `chmod +x ./build_fix.sh && ./build_fix.sh && npm install && npm run build`
3. The start command is: `npm start`

## Troubleshooting

If you encounter build errors related to module resolution:

1. The build_fix.sh script should fix most common issues:
   - Creates a JavaScript version of next.config.js
   - Fixes import statements with spaces
   - Ensures proper module resolution

2. If you still encounter issues:
   - Check that all UI components are present in the src/components/ui directory
   - Verify that all context providers are properly set up
   - Make sure all dependencies are correctly installed