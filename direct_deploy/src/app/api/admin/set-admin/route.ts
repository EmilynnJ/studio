import { NextResponse } from 'next/server';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

export async function POST(request: Request) {
  try {
    // Get admin credentials from environment variables
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      return NextResponse.json({ error: 'Admin credentials not configured' }, { status: 500 });
    }

    // Sign in with the admin credentials
    const auth = getAuth();
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
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Admin role set successfully',
      uid: user.uid
    });
    
  } catch (error: any) {
    console.error('Error setting admin role:', error);
    
    return NextResponse.json({ 
      error: error.message || 'Failed to set admin role' 
    }, { status: 500 });
  }
}