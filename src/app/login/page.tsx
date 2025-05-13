'use client';

import Link from 'next/link';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CelestialIcon } from '@/components/icons/celestial-icon';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAdminSetup, setIsAdminSetup] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { login, currentUser } = useAuth();

  // Pre-fill admin credentials if they match the environment variables
  useEffect(() => {
    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || process.env.ADMIN_EMAIL;
    if (adminEmail === 'emilynn992@gmail.com') {
      setEmail('emilynn992@gmail.com');
      setPassword('JayJas1423!');
      setIsAdminSetup(true);
    }
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === 'admin') {
        router.push('/admin');
      } else if (currentUser.role === 'reader') {
        router.push('/reader-dashboard');
      } else {
        router.push('/');
      }
    }
  }, [currentUser, router]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    
    try {
      // Use the auth context login function
      const success = await login(email, password);
      
      if (success) {
        // If this is the admin email and we're setting up the admin account
        if (isAdminSetup && email === 'emilynn992@gmail.com') {
          try {
            // Check if user exists in Firestore and has admin role
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            const userDocRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userDocRef);
            
            if (!userDoc.exists()) {
              // Create admin user document
              await setDoc(userDocRef, {
                uid: user.uid,
                email: email,
                name: 'Admin User',
                role: 'admin',
                createdAt: new Date(),
                updatedAt: new Date()
              });
              
              toast({
                title: "Admin Setup Complete",
                description: "Your admin account has been configured.",
                variant: "default",
              });
            } else if (userDoc.data().role !== 'admin') {
              // Update role to admin if not already
              await setDoc(userDocRef, {
                ...userDoc.data(),
                role: 'admin',
                updatedAt: new Date()
              }, { merge: true });
              
              toast({
                title: "Admin Role Updated",
                description: "Your account has been granted admin privileges.",
                variant: "default",
              });
            }
            
            router.push('/admin');
          } catch (error) {
            console.error("Admin setup error:", error);
          }
        } else {
          router.push('/'); // Redirect to homepage on successful login
          router.refresh(); // Refresh to update auth state in the UI
        }
      }
    } catch (error) {
      toast({
        title: "Something went wrong",
        description: "Please try again later.",
        variant: "destructive",
      });
      console.error("Login error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-br from-[hsl(var(--primary)/0.1)] to-[hsl(var(--background))]">
      <Card className="w-full max-w-md bg-[hsl(var(--card))] border-[hsl(var(--border)/0.7)] shadow-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <CelestialIcon className="h-16 w-16 text-[hsl(var(--soulseer-header-pink))]" />
          </div>
          <CardTitle className="text-4xl font-alex-brush text-[hsl(var(--soulseer-header-pink))]">
            {isAdminSetup ? 'Admin Login' : 'Login to SoulSeer'}
          </CardTitle>
          <CardDescription className="font-playfair-display text-muted-foreground">
            {isAdminSetup ? 'Complete your admin setup' : 'Access your spiritual journey.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email-login" className="font-playfair-display text-foreground/90">Email</Label>
              <Input 
                id="email-login" 
                type="email" 
                placeholder="mystic@example.com" 
                required 
                className="bg-input text-foreground placeholder:text-muted-foreground"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading || isAdminSetup}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password-login" className="font-playfair-display text-foreground/90">Password</Label>
              <Input 
                id="password-login" 
                type="password" 
                placeholder="Your sacred password" 
                required 
                className="bg-input text-foreground placeholder:text-muted-foreground"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading || isAdminSetup}
              />
            </div>
            <Button 
              type="submit" 
              className="w-full bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary)/0.9)] font-playfair-display text-lg py-3" 
              disabled={isLoading}
            >
              {isLoading ? 
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {isAdminSetup ? 'Setting up admin...' : 'Entering...'}
                </span> : 
                (isAdminSetup ? 'Complete Admin Setup' : 'Enter the Portal')
              }
            </Button>
          </form>
        </CardContent>
        {!isAdminSetup && (
          <CardFooter className="flex flex-col items-center space-y-2">
            <Link 
              href="/forgot-password" 
              className="text-sm font-playfair-display text-[hsl(var(--primary))] hover:underline"
            >
              Forgot your password?
            </Link>
            <p className="text-sm font-playfair-display text-muted-foreground">
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="font-semibold text-[hsl(var(--primary))] hover:underline">
                Sign Up
              </Link>
            </p>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}