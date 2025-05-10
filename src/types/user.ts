import type { Timestamp } from 'firebase/firestore';

export interface AppUser {
  uid: string;
  email: string | null;
  name: string | null; // From signup form, can be Firebase displayName
  photoURL?: string | null;
  role: 'client' | 'reader' | null; // Role selected during signup
  createdAt?: Timestamp; // Timestamp from Firestore
}
