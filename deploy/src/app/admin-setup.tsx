'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminSetup() {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const setupAdmin = async () => {
    setIsLoading(true);
    setMessage('');
    setError('');

    try {
      // Get admin credentials from environment variables
      const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
      const adminPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD;

      if (!adminEmail || !adminPassword) {
        throw new Error('Admin credentials not configured');
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
        setMessage('Admin role updated successfully!');
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
        setMessage('Admin user document created successfully!');
      }

      // Redirect to admin dashboard after a delay
      setTimeout(() => {
        router.push('/admin');
      }, 2000);
    } catch (error: any) {
      console.error('Error setting up admin:', error);
      setError(error.message || 'Failed to set up admin');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Admin Setup</CardTitle>
          <CardDescription>Set up the admin account for SoulSeer</CardDescription>
        </CardHeader>
        <CardContent>
          {message && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
              {message}
            </div>
          )}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          <p className="mb-4">
            This will set up the admin account using the credentials from your environment variables.
          </p>
        </CardContent>
        <CardFooter>
          <Button onClick={setupAdmin} disabled={isLoading} className="w-full">
            {isLoading ? 'Setting up...' : 'Set Up Admin Account'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}