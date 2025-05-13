# SoulSeer Admin Setup Guide

This guide provides multiple methods to set up your admin account for the SoulSeer application.

## Method 1: Direct Admin Setup Page (Recommended)

1. Navigate to `/admin-direct-setup` in your browser
2. The page will automatically attempt to create or update the admin account
3. You will see a success message when the setup is complete
4. Click the button to go to the admin dashboard

## Method 2: Using the Login Page

1. Navigate to the login page at `/login`
2. The login form should be pre-filled with the admin credentials:
   - Email: `emilynn992@gmail.com`
   - Password: `JayJas1423!`
3. Click "Complete Admin Setup" to create your admin account
4. You will be redirected to the admin dashboard

## Method 3: Using the API Directly

You can also set up the admin account by making a GET request to the admin setup API:

```
GET /api/admin/direct-setup
```

This will create the admin account or update an existing account with admin privileges.

## Method 4: Using the Firebase Console

If all else fails, you can manually set up the admin account:

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `soulseer-2c4ed`
3. Navigate to Authentication > Users
4. Click "Add User"
5. Enter the admin email and password:
   - Email: `emilynn992@gmail.com`
   - Password: `JayJas1423!`
6. Copy the User UID that is generated
7. Navigate to Firestore Database
8. Create a collection named `users` if it doesn't exist
9. Add a new document with the ID matching the User UID from step 6
10. Add the following fields:
    ```
    uid: [User UID]
    email: "emilynn992@gmail.com"
    name: "Admin User"
    role: "admin"
    createdAt: [Current timestamp]
    updatedAt: [Current timestamp]
    ```

## Troubleshooting

If you encounter the "Missing or insufficient permissions" error:

1. This is a Firebase security rules issue
2. Try using the `/admin-direct-setup` page which has been optimized to work with restrictive security rules
3. If that doesn't work, you may need to temporarily update your Firebase security rules to allow the admin setup

### Temporary Firebase Rules for Setup

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

After setting up the admin account, revert to more secure rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow admin users full access
    match /{document=**} {
      allow read, write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Public user profiles
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```