# SoulSeer Admin Setup Instructions

Follow these steps to set up your admin account for the SoulSeer application.

## Method 1: Using the Login Page (Recommended)

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

## Method 2: Using the Firebase Console

If Method 1 doesn't work, you can manually set up the admin account:

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

## Verifying Admin Setup

1. Log in to the application with your admin credentials
2. Navigate to `/admin` to access the admin dashboard
3. You should see options to manage readers, products, and view analytics

## Troubleshooting

If you encounter issues with the admin setup:

1. Check your Firebase security rules to ensure they allow write access for initial setup
2. Verify that your Firebase configuration in `.env` is correct
3. Check the browser console for any error messages
4. Try clearing your browser cache and cookies

## Security Note

After setting up the admin account, consider:

1. Removing the admin credentials from `.env.local` if you no longer need them
2. Updating your Firebase security rules to restrict access
3. Changing the admin password to something more secure