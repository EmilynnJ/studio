# SoulSeer Deployment

This is the deployment package for SoulSeer.

## Deployment Instructions

1. Make sure all environment variables are set in the Render dashboard:
   - Firebase configuration
   - Stripe keys
   - WebRTC configuration

2. The build command is: `npm install; npm run build`
3. The start command is: `npm start`

## Troubleshooting

If you encounter build errors related to module resolution:

1. Check that all import paths are correct (no spaces after the @ symbol)
2. Ensure next.config.js is properly configured
3. Verify that all UI components are present in the src/components/ui directory