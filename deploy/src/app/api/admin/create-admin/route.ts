import { NextResponse } from 'next/server';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/firebase';

export async function POST(request: Request) {
  try {
    // Get admin credentials from environment variables
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      return NextResponse.json({ error: 'Admin credentials not configured' }, { status: 500 });
    }

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
      
      return NextResponse.json({ 
        success: true, 
        message: 'Admin account created successfully',
        uid: user.uid
      });
    } catch (createError: any) {
      // If the email is already in use, return a specific message
      if (createError.code === 'auth/email-already-in-use') {
        return NextResponse.json({ 
          success: false, 
          message: 'Admin email already exists. Please use the login page to set admin role.',
          error: createError.message
        }, { status: 400 });
      }
      
      throw createError;
    }
    
  } catch (error: any) {
    console.error('Error creating admin account:', error);
    
    return NextResponse.json({ 
      error: error.message || 'Failed to create admin account' 
    }, { status: 500 });
  }
}