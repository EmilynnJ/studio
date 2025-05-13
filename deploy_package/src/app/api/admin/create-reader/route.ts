import { NextResponse } from 'next/server';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/firebase';

export async function POST(request: Request) {
  try {
    // Check if the current user is an admin (you might want to implement this)
    // This is a simplified version - in production, you'd verify the admin status
    
    const { email, password, displayName } = await request.json();
    
    if (!email || !password || !displayName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Create the user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Set the display name
    await updateProfile(user, { displayName });
    
    // Return the user ID for further processing
    return NextResponse.json({ uid: user.uid });
    
  } catch (error: any) {
    console.error('Error creating reader account:', error);
    
    // Handle specific Firebase Auth errors
    if (error.code === 'auth/email-already-in-use') {
      return NextResponse.json({ error: 'Email is already in use' }, { status: 400 });
    } else if (error.code === 'auth/invalid-email') {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    } else if (error.code === 'auth/weak-password') {
      return NextResponse.json({ error: 'Password is too weak' }, { status: 400 });
    }
    
    return NextResponse.json({ error: error.message || 'Failed to create reader account' }, { status: 500 });
  }
}