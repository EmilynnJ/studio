'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminDirectSetup() {
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
      const adminEmail = 'emilynn992@gmail.com';
      const adminPassword = 'JayJas1423!';

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
        
        setMessage('Admin account created successfully!');
        
        // Redirect to admin dashboard after a delay
        setTimeout(() => {
          router.push('/admin');
        }, 2000);
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
            
            setMessage('Admin role updated successfully!');
            
            // Redirect to admin dashboard after a delay
            setTimeout(() => {
              router.push('/admin');
            }, 2000);
          } catch (signInError: any) {
            setError(`Failed to sign in with admin credentials: ${signInError.message}`);
          }
        } else {
          setError(`Failed to create admin account: ${createError.message}`);
        }
      }
    } catch (error: any) {
      setError(`Error setting up admin: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-run setup on component mount
  useEffect(() => {
    setupAdmin();
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Admin Setup</CardTitle>
          <CardDescription>Setting up your admin account for SoulSeer</CardDescription>
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
            {isLoading ? 'Setting up admin account...' : 'Admin setup complete.'}
          </p>
        </CardContent>
        <CardFooter>
          <Button onClick={setupAdmin} disabled={isLoading} className="w-full">
            {isLoading ? 'Setting up...' : 'Retry Setup'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}