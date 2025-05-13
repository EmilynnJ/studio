# SoulSeer Firebase Setup Guide

This guide will help you set up Firebase for the SoulSeer application.

## Firebase Authentication

SoulSeer uses Firebase Authentication for user management. The app is already configured to use Firebase Authentication with email/password sign-in.

### Admin Account Setup

To set up your admin account:

1. Start the application:
   ```
   npm run dev
   ```

2. Navigate to the login page at `/login`

3. The login form should be pre-filled with the admin credentials:
   - Email: `emilynn992@gmail.com`
   - Password: `JayJas1423!`

4. Click "Complete Admin Setup" to create your admin account

5. You will be automatically redirected to the admin dashboard

## Firebase Security Rules

For proper security, update your Firestore rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow admin users full access
    match /{document=**} {
      allow read, write: if request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Public user profiles - allow reading basic info
    match /users/{userId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.auth.uid == userId;
      allow update: if request.auth != null && request.auth.uid == userId;
    }
    
    // Sessions
    match /sessions/{sessionId} {
      allow read: if request.auth != null && (
        request.auth.uid == resource.data.clientId || 
        request.auth.uid == resource.data.readerId
      );
      allow create: if request.auth != null;
      allow update: if request.auth != null && (
        request.auth.uid == resource.data.clientId || 
        request.auth.uid == resource.data.readerId
      );
    }
    
    // Products
    match /products/{productId} {
      allow read: if true;
      allow write: if request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

## Firebase Storage Rules

For Firebase Storage:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Profile images
    match /profile_images/{imageId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Product images
    match /product_images/{imageId} {
      allow read: if true;
      allow write: if request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

## Firebase Realtime Database Rules

For WebRTC signaling:

```
{
  "rules": {
    "sessions": {
      "$sessionId": {
        ".read": "auth != null && (data.child('clientId').val() === auth.uid || data.child('readerId').val() === auth.uid)",
        ".write": "auth != null && (data.child('clientId').val() === auth.uid || data.child('readerId').val() === auth.uid || newData.child('clientId').val() === auth.uid || newData.child('readerId').val() === auth.uid)"
      }
    },
    "signaling": {
      "$sessionId": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    },
    "presence": {
      "$uid": {
        ".read": "auth != null",
        ".write": "auth != null && auth.uid === $uid"
      }
    }
  }
}
```

## Troubleshooting

If you encounter issues with Firebase:

1. Check that your Firebase configuration in `.env` is correct
2. Verify that your Firebase project has Authentication enabled with Email/Password sign-in
3. Make sure your Firebase security rules are properly configured
4. Check the browser console for any Firebase-related errors