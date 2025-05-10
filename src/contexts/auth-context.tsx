'use client';

import type { ReactNode } from 'react';
import React, { createContext, useContext, useEffect, useState }
from 'react';
import type { User as FirebaseUser, AuthError } from 'firebase/auth';
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/firebase';
import type { AppUser } from '@/types/user';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  currentUser: AppUser | null;
  loading: boolean;
  login: (email_login: string, password_login: string) => Promise<boolean>;
  signup: (email_signup: string, password_signup: string, name_signup: string, role_signup: 'client' | 'reader') => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const customData = userDocSnap.data();
          setCurrentUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            name: firebaseUser.displayName || customData.name,
            photoURL: firebaseUser.photoURL,
            role: customData.role || null,
            createdAt: customData.createdAt,
          });
        } else {
          // This case might happen if user was created but Firestore doc failed
          // Or if user is from a different auth system / manual creation.
          // For now, set with available Firebase data and null role.
          setCurrentUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            name: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            role: null, // Role unknown
          });
          console.warn(`No Firestore document found for user ${firebaseUser.uid}`);
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email_login: string, password_login: string) => {
    try {
      await signInWithEmailAndPassword(auth, email_login, password_login);
      toast({ title: 'Login Successful', description: 'Welcome back!' });
      return true;
    } catch (error) {
      const authError = error as AuthError;
      console.error('Login error:', authError);
      toast({ variant: 'destructive', title: 'Login Failed', description: authError.message });
      return false;
    }
  };

  const signup = async (email_signup: string, password_signup: string, name_signup: string, role_signup: 'client' | 'reader') => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email_signup, password_signup);
      const firebaseUser = userCredential.user;

      // Update Firebase Auth profile
      await updateProfile(firebaseUser, { displayName: name_signup });

      // Create user document in Firestore
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      await setDoc(userDocRef, {
        uid: firebaseUser.uid,
        email: email_signup,
        name: name_signup,
        role: role_signup,
        createdAt: serverTimestamp(),
        photoURL: null, // Can be updated later
      });
      
      toast({ title: 'Signup Successful', description: 'Welcome to SoulSeer!' });
      return true;
    } catch (error) {
      const authError = error as AuthError;
      console.error('Signup error:', authError);
      toast({ variant: 'destructive', title: 'Signup Failed', description: authError.message });
      return false;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      toast({ title: 'Logged Out', description: 'You have been successfully logged out.' });
    } catch (error) {
      const authError = error as AuthError;
      console.error('Logout error:', authError);
      toast({ variant: 'destructive', title: 'Logout Failed', description: authError.message });
    }
  };

  const value = {
    currentUser,
    loading,
    login,
    signup,
    logout,
  };

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
