// Direct admin initialization script using Firebase SDK
require('dotenv').config();
const { initializeApp } = require('firebase/app');
const { getAuth, createUserWithEmailAndPassword, updateProfile, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, doc, setDoc, getDoc, updateDoc } = require('firebase/firestore');

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.FIREBASE_DATABASE_URL,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function initializeAdmin() {
  try {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      console.error('❌ Admin credentials not configured in .env file');
      return;
    }

    console.log('Initializing admin account...');
    console.log(`Email: ${adminEmail}`);

    try {
      // Try to create a new user with admin credentials
      const userCredential = await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
      const user = userCredential.user;
      
      // Set display name
      await updateProfile(user, { displayName: 'Admin User' });
      
      // Create admin user document in Firestore
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, {
        uid: user.uid,
        email: adminEmail,
        name: 'Admin User',
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      console.log('✅ Admin account created successfully!');
      console.log('UID:', user.uid);
      
    } catch (createError) {
      // If the email is already in use, try to sign in and update the role
      if (createError.code === 'auth/email-already-in-use') {
        console.log('Admin email already exists. Attempting to sign in and update role...');
        
        try {
          // Sign in with the admin credentials
          const userCredential = await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
          const user = userCredential.user;
          
          // Check if user exists in Firestore
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            // Update the user's role to admin
            await updateDoc(userDocRef, { 
              role: 'admin',
              updatedAt: new Date()
            });
            console.log('✅ Admin role updated successfully!');
          } else {
            // Create a new user document with admin role
            await setDoc(userDocRef, {
              uid: user.uid,
              email: adminEmail,
              name: user.displayName || 'Admin User',
              role: 'admin',
              createdAt: new Date(),
              updatedAt: new Date()
            });
            console.log('✅ Admin user document created successfully!');
          }
          
          console.log('UID:', user.uid);
          
        } catch (signInError) {
          console.error('❌ Failed to sign in with admin credentials:', signInError.message);
        }
      } else {
        console.error('❌ Failed to create admin account:', createError.message);
      }
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    // Exit the process after completion
    process.exit(0);
  }
}

initializeAdmin();