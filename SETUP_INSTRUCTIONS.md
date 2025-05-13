# SoulSeer Setup Instructions

## Admin Account Setup

I've created multiple ways to set up your admin account. Try them in this order:

### Method 1: Standalone HTML Page (Most Reliable)

1. Access the standalone admin setup page at `/admin-setup.html`
2. This page uses direct Firebase client SDK calls and should work regardless of security rules
3. Follow the on-screen instructions

### Method 2: Admin Setup Script Page

1. Navigate to `/admin-setup-script`
2. This page will automatically attempt to create or update the admin account
3. You will see a success message when the setup is complete

### Method 3: Direct Admin Setup Page

1. Navigate to `/admin-direct-setup`
2. The page will automatically attempt to create or update the admin account
3. You will see a success message when the setup is complete

### Method 4: Using the Login Page

1. Navigate to the login page at `/login`
2. The login form should be pre-filled with the admin credentials
3. Click "Complete Admin Setup" to create your admin account

## Firebase Security Rules

If you're still experiencing "Missing or insufficient permissions" errors, you may need to temporarily update your Firebase security rules:

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `soulseer-2c4ed`
3. Navigate to Firestore Database > Rules
4. Update the rules to allow write access temporarily:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

After setting up the admin account, revert to more secure rules.

## Deployment Issues

If you're experiencing deployment issues with missing modules, make sure:

1. All required UI components are present in the `src/components/ui` directory
2. The Firebase configuration is properly set up in `src/lib/firebase/firebase.ts`
3. All environment variables are set in your deployment platform

## Next Steps

Once your admin account is set up:

1. Log in with your admin credentials
2. Navigate to the admin dashboard at `/admin`
3. Start creating reader accounts and configuring your platform

For more detailed instructions, see the `ADMIN_SETUP_GUIDE.md` file.