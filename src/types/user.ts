import { Timestamp } from 'firebase/firestore';

export interface AppUser {
  uid: string;
  email: string | null;
  name: string | null;
  photoURL: string | null;
  role: 'admin' | 'reader' | 'client' | null;
  createdAt?: Timestamp | Date;
  status?: 'online' | 'offline' | 'busy';
  balance?: number;
  ratePerMinute?: number;
  bio?: string;
  specialties?: string;
  token?: string;
}

export interface Reader extends AppUser {
  role: 'reader';
  status: 'online' | 'offline' | 'busy';
  ratePerMinute: number;
  bio: string;
  specialties: string;
  rating?: number;
  totalSessions?: number;
  totalMinutes?: number;
  availableForChat?: boolean;
  availableForVoice?: boolean;
  availableForVideo?: boolean;
}

export interface Client extends AppUser {
  role: 'client';
  balance: number;
  favoriteReaders?: string[];
  lastActivity?: Timestamp | Date;
}

export interface Admin extends AppUser {
  role: 'admin';
}