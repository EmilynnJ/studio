'use client';
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AppUser {
  uid: string;
  email: string | null;
  name: string | null;
  photoURL: string | null;
  role: string;
  balance?: number;
}

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
  const [loading, setLoading] = useState(false);

  const login = async () => true;
  const signup = async () => true;
  const signOut = async () => {};

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