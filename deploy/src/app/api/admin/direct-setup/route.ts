import { NextResponse } from 'next/server';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/firebase';

export async function GET(request: Request) {
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
      // If the email is already in use, try to sign in and update the role
      if (createError.code === 'auth/email-already-in-use') {
        try {
          // Sign in with the admin credentials
          const userCredential = await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
          const user = userCredential.user;
          
          // Create or update admin user document in Firestore
          const userDocRef = doc(db, 'users', user.uid);
          await setDoc(userDocRef, {
            uid: user.uid,
            email: adminEmail,
            name: 'Admin User',
            role: 'admin',
            updatedAt: new Date()
          }, { merge: true });
          
          return NextResponse.json({ 
            success: true, 
            message: 'Admin role updated successfully',
            uid: user.uid
          });
        } catch (signInError: any) {
          return NextResponse.json({ 
            error: `Failed to sign in with admin credentials: ${signInError.message}` 
          }, { status: 500 });
        }
      } else {
        return NextResponse.json({ 
          error: `Failed to create admin account: ${createError.message}` 
        }, { status: 500 });
      }
    }
    
  } catch (error: any) {
    console.error('Error setting up admin account:', error);
    
    return NextResponse.json({ 
      error: error.message || 'Failed to set up admin account' 
    }, { status: 500 });
  }
}