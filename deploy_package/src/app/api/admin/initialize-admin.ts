import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/firebase';

/**
 * Initialize admin account directly using Firebase Admin SDK
 * This can be called from a server-side script or API route
 */
export async function initializeAdmin(email: string, password: string) {
  try {
    if (!email || !password) {
      throw new Error('Admin credentials not configured');
    }

    try {
      // Try to create a new user with admin credentials
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Set display name
      await updateProfile(user, { displayName: 'Admin User' });
      
      // Create admin user document in Firestore
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, {
        uid: user.uid,
        email: email,
        name: 'Admin User',
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      return {
        success: true,
        message: 'Admin account created successfully',
        uid: user.uid
      };
    } catch (createError: any) {
      // If the email is already in use, try to sign in and update the role
      if (createError.code === 'auth/email-already-in-use') {
        return {
          success: false,
          message: 'Admin email already exists. Please use the set-admin endpoint to update the role.',
          error: createError.message
        };
      }
      
      throw createError;
    }
  } catch (error: any) {
    console.error('Error initializing admin account:', error);
    return {
      success: false,
      error: error.message || 'Failed to initialize admin account'
    };
  }
}