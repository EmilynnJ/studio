# Firebase Rules Configuration for SoulSeer

To properly set up your admin account and ensure the application works correctly, you'll need to configure your Firebase security rules.

## Firestore Rules

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

## Storage Rules

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

## Setting Up Admin Account

### Step 1: Temporarily Allow Write Access

For initial setup, you may need to temporarily set more permissive rules:

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

### Step 2: Create Admin User

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `soulseer-2c4ed`
3. Navigate to Authentication > Users
4. Click "Add User"
5. Enter the admin email and password:
   - Email: `emilynn992@gmail.com`
   - Password: `JayJas1423!`
6. Copy the User UID that is generated

### Step 3: Create Admin Document in Firestore

1. Navigate to Firestore Database
2. Create a collection named `users` if it doesn't exist
3. Add a new document with the ID matching the User UID from step 2
4. Add the following fields:
   ```
   uid: [User UID]
   email: "emilynn992@gmail.com"
   name: "Admin User"
   role: "admin"
   createdAt: [Current timestamp]
   updatedAt: [Current timestamp]
   ```

### Step 4: Restore Secure Rules

After setting up the admin account, restore the secure rules from the first section.

## Testing Admin Access

1. Log in to the application with your admin credentials
2. Navigate to `/admin` to access the admin dashboard
3. You should see options to manage readers, products, and view analytics