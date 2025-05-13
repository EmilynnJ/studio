// Simple script to set a user as admin in Firebase
require('dotenv').config();
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');

// Initialize Firebase Admin with environment variables
const admin = require('firebase-admin');

// Get the admin email from environment variables
const adminEmail = process.env.ADMIN_EMAIL || 'emilynn992@gmail.com';

// Initialize the app
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  databaseURL: process.env.FIREBASE_DATABASE_URL
});

const db = admin.firestore();
const auth = admin.auth();

async function setAdminRole() {
  try {
    console.log(`Setting admin role for user: ${adminEmail}`);
    
    // Find the user by email
    const userRecord = await auth.getUserByEmail(adminEmail);
    console.log(`Found user: ${userRecord.uid}`);
    
    // Set custom claims to mark as admin
    await auth.setCustomUserClaims(userRecord.uid, { admin: true });
    
    // Update or create the user document in Firestore
    await db.collection('users').doc(userRecord.uid).set({
      role: 'admin',
      updatedAt: new Date()
    }, { merge: true });
    
    console.log(`✅ Successfully set admin role for ${adminEmail}`);
    process.exit(0);
  } catch (error) {
    console.error(`❌ Error setting admin role: ${error.message}`);
    
    // If user doesn't exist, create the user
    if (error.code === 'auth/user-not-found') {
      try {
        console.log(`User not found. Creating user: ${adminEmail}`);
        const userRecord = await auth.createUser({
          email: adminEmail,
          password: process.env.ADMIN_PASSWORD || 'JayJas1423!',
          displayName: 'Admin User'
        });
        
        // Set custom claims to mark as admin
        await auth.setCustomUserClaims(userRecord.uid, { admin: true });
        
        // Create admin user document in Firestore
        await db.collection('users').doc(userRecord.uid).set({
          uid: userRecord.uid,
          email: adminEmail,
          name: 'Admin User',
          role: 'admin',
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        console.log(`✅ Successfully created admin user: ${adminEmail}`);
      } catch (createError) {
        console.error(`❌ Error creating admin user: ${createError.message}`);
      }
    }
    
    process.exit(1);
  }
}

// Run the function
setAdminRole();