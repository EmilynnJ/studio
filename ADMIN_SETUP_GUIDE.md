# SoulSeer Admin Setup Guide

This guide will help you set up the admin account for the SoulSeer application.

## Method 1: Using the Firebase Console

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `soulseer-2c4ed`
3. Navigate to Authentication > Users
4. Create a new user with the following credentials:
   - Email: `emilynn992@gmail.com`
   - Password: `JayJas1423!`
5. Copy the User UID that is generated
6. Navigate to Firestore Database
7. Create a new document in the `users` collection with the ID matching the User UID
8. Add the following fields to the document:
   ```
   uid: [User UID]
   email: "emilynn992@gmail.com"
   name: "Admin User"
   role: "admin"
   createdAt: [Current timestamp]
   updatedAt: [Current timestamp]
   ```
9. Save the document

## Method 2: Using the Admin Setup Page

1. Start the application:
   ```
   npm run dev
   ```
2. Navigate to `/admin-setup` in your browser
3. Click the "Set Up Admin Account" button
4. You will be redirected to the admin dashboard if successful

## Method 3: Using the Direct Initialization Script

If you encounter permission issues with the direct script, make sure your Firebase rules allow write access:

1. Go to the Firebase Console
2. Navigate to Firestore Database > Rules
3. Update the rules to allow write access temporarily:
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
4. Run the initialization script:
   ```
   node scripts/direct-init-admin.js
   ```
5. After successful setup, revert the rules to a more secure configuration

## Verifying Admin Setup

1. Log in to the application with your admin credentials
2. Navigate to `/admin` to access the admin dashboard
3. You should see options to manage readers, products, and view analytics

## Security Note

After setting up the admin account, make sure to:

1. Remove the admin credentials from `.env.local` if you used Method 2
2. Secure your Firestore rules to prevent unauthorized access
3. Consider changing the admin password through the Firebase Console