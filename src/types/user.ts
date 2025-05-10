import type { Timestamp } from 'firebase/firestore';

export interface AppUser {
  uid: string;
  email: string | null;
  name: string | null; // From signup form, can be Firebase displayName
  photoURL?: string | null; // Added for user avatar
  role: 'client' | 'reader' | null; // Role selected during signup
  createdAt?: Timestamp; // Timestamp from Firestore
  status?: 'online' | 'offline' | 'busy'; // Reader availability status
  ratePerMinute?: number; // For readers, e.g., price in USD per minute
  balance?: number; // For clients, their available funds for sessions
}

