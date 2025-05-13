# Simple Admin Setup for SoulSeer

I've created two simple ways to set up your admin account:

## Option 1: HTML Page (Easiest)

1. After deploying your app, visit:
   ```
   https://your-app-url.com/admin-setup-simple.html
   ```

2. Click the "Set Up Admin Account" button

3. You'll see a success message when the admin account is set up

This HTML page uses client-side Firebase SDK to:
- Sign in with your admin credentials
- Create the user if it doesn't exist
- Set the role to "admin" in Firestore

## Option 2: Node.js Script

If you prefer using a script:

1. Install Firebase Admin SDK:
   ```
   npm install firebase-admin
   ```

2. Set up your Firebase credentials:
   ```
   export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/firebase-credentials.json"
   ```

3. Run the script:
   ```
   node set-admin.js
   ```

The script will:
- Find the user by email
- Set custom claims to mark as admin
- Update the Firestore document with admin role

## Firebase Console Method

You can also do this manually in the Firebase Console:

1. Go to Authentication > Users
2. Find the user with email "emilynn992@gmail.com"
3. Copy the User UID
4. Go to Firestore Database
5. Find or create a document in the "users" collection with the User UID
6. Add or update the "role" field to "admin"

That's it! Any of these methods will set up your admin account.