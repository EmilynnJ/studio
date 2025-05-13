export interface AppUser {
  uid: string;
  email: string | null;
  name: string | null;
  photoURL: string | null;
  role: 'client' | 'reader' | 'admin';
  balance?: number;
  bio?: string;
  specialties?: string[];
  ratePerMinute?: number;
  isAvailable?: boolean;
  stripeCustomerId?: string;
  stripeConnectId?: string;
}