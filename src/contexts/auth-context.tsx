
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
  getIdToken,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/firebase';
import type { AppUser } from '@/types/user';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  currentUser: AppUser | null;
  loading: boolean;
  login: (email_login: string, password_login: string) => Promise<boolean>;
  signup: (email_signup: string, password_signup: string, name_signup: string, role_signup: 'client' | 'reader') => Promise<boolean>;
  logout: () => Promise<void>;
  updateUserStatus: (uid: string, status: 'online' | 'offline' | 'busy') => Promise<void>;
  updateUserBalance: (uid: string, newBalance: number) => Promise<void>; // Added for balance updates
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
        const token = await getIdToken(firebaseUser);


        if (userDocSnap.exists()) {
          const customData = userDocSnap.data();
          setCurrentUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            name: firebaseUser.displayName || customData.name,
            photoURL: firebaseUser.photoURL,
            role: customData.role || null,
            createdAt: customData.createdAt,
            status: customData.status || (customData.role === 'reader' ? 'offline' : undefined),
            balance: customData.balance || (customData.role === 'client' ? 100 : undefined), // Default client balance for demo
            ratePerMinute: customData.ratePerMinute,
            token: token,
          });
        } else {
          // This case should ideally not happen if signup creates the user doc properly
          setCurrentUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            name: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            role: null, 
            status: undefined,
            balance: undefined, // Or a default if applicable
            token: token,
          });
          console.warn(`No Firestore document found for user ${firebaseUser.uid}. This might indicate an issue with signup.`);
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

      await updateProfile(firebaseUser, { displayName: name_signup });

      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const userData: Omit<AppUser, 'token'> = { // Exclude token initially, it's added on auth state change
        uid: firebaseUser.uid,
        email: email_signup,
        name: name_signup,
        role: role_signup,
        createdAt: serverTimestamp() as any, // Firestore specific, cast for AppUser
        photoURL: null,
        status: role_signup === 'reader' ? 'offline' : undefined,
        balance: role_signup === 'client' ? 100 : undefined, // Default client balance for demo
        ratePerMinute: role_signup === 'reader' ? 5 : undefined, // Default reader rate for demo
      };
      await setDoc(userDocRef, userData);
      
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
      if (currentUser?.role === 'reader' && currentUser.uid) {
        await updateUserStatus(currentUser.uid, 'offline');
      }
      await signOut(auth);
      toast({ title: 'Logged Out', description: 'You have been successfully logged out.' });
    } catch (error) {
      const authError = error as AuthError;
      console.error('Logout error:', authError);
      toast({ variant: 'destructive', title: 'Logout Failed', description: authError.message });
    }
  };

  const updateUserStatus = async (uid: string, status: 'online' | 'offline' | 'busy') => {
    try {
      const userDocRef = doc(db, 'users', uid);
      await updateDoc(userDocRef, { status });
      if (currentUser && currentUser.uid === uid) {
        setCurrentUser(prev => prev ? { ...prev, status } : null);
      }
    } catch (error) {
      console.error("Error updating user status:", error);
      toast({ variant: 'destructive', title: 'Status Update Failed', description: 'Could not update user status.' });
    }
  };

  const updateUserBalance = async (uid: string, newBalance: number) => {
    try {
      const userDocRef = doc(db, 'users', uid);
      await updateDoc(userDocRef, { balance: newBalance });
      if (currentUser && currentUser.uid === uid) {
        setCurrentUser(prev => prev ? { ...prev, balance: newBalance } : null);
      }
    } catch (error) {
      console.error("Error updating user balance:", error);
      // Avoid toasting for every balance update during a session, could be too noisy
      // toast({ variant: 'destructive', title: 'Balance Update Failed', description: 'Could not update user balance.' });
    }
  };


  const value = {
    currentUser,
    loading,
    login,
    signup,
    logout,
    updateUserStatus,
    updateUserBalance,
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
