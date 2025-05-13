'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  getAuth, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { AppUser } from '@/types/user';

interface AuthContextType {
  currentUser: AppUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (email: string, password: string, name: string) => Promise<boolean>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const auth = getAuth();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Get user data from Firestore
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          
          if (userDoc.exists()) {
            // User exists in Firestore
            setCurrentUser({
              uid: user.uid,
              email: user.email,
              name: user.displayName,
              photoURL: user.photoURL,
              ...userDoc.data(),
            } as AppUser);
          } else {
            // User exists in Auth but not in Firestore
            // Create a basic user document
            const newUser: AppUser = {
              uid: user.uid,
              email: user.email,
              name: user.displayName,
              photoURL: user.photoURL,
              role: 'client', // Default role
            };
            
            await setDoc(doc(db, 'users', user.uid), {
              ...newUser,
              createdAt: new Date(),
            });
            
            setCurrentUser(newUser);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth]);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Get user data from Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (userDoc.exists()) {
        // Update the user state with Firestore data
        setCurrentUser({
          uid: user.uid,
          email: user.email,
          name: user.displayName,
          photoURL: user.photoURL,
          ...userDoc.data(),
        } as AppUser);
      } else {
        // Create a basic user document if it doesn't exist
        const newUser: AppUser = {
          uid: user.uid,
          email: user.email,
          name: user.displayName,
          photoURL: user.photoURL,
          role: 'client', // Default role
        };
        
        await setDoc(doc(db, 'users', user.uid), {
          ...newUser,
          createdAt: new Date(),
        });
        
        setCurrentUser(newUser);
      }
      
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const signup = async (email: string, password: string, name: string): Promise<boolean> => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Create user document in Firestore
      const newUser: AppUser = {
        uid: user.uid,
        email: user.email,
        name: name,
        photoURL: null,
        role: 'client', // Default role
      };
      
      await setDoc(doc(db, 'users', user.uid), {
        ...newUser,
        createdAt: new Date(),
      });
      
      setCurrentUser(newUser);
      return true;
    } catch (error) {
      console.error('Signup error:', error);
      return false;
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      await firebaseSignOut(auth);
      setCurrentUser(null);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const value = {
    currentUser,
    loading,
    login,
    signup,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}