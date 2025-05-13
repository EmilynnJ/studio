import type { Timestamp } from 'firebase/firestore';
import type { AppUser } from './user';

export type SessionType = 'video' | 'audio' | 'chat';
export type CallRole = 'caller' | 'callee' | 'unknown';
export type CallStatus = 
  | 'idle' 
  | 'loading_session' 
  | 'waiting_permission' 
  | 'permission_granted' 
  | 'connecting' 
  | 'connected' 
  | 'disconnected' 
  | 'error' 
  | 'ended';

export interface VideoSessionData {
  sessionId: string;
  readerUid: string;
  readerName: string;
  readerPhotoURL?: string | null;
  clientUid: string;
  clientName: string;
  clientPhotoURL?: string | null;
  status: 'pending' | 'accepted_by_reader' | 'active' | 'ended' | 'cancelled' | 'ended_insufficient_funds'; 
  requestedAt: Timestamp;
  startedAt?: Timestamp;
  endedAt?: Timestamp;
  sessionType: SessionType;
  totalMinutes?: number; // Total billed minutes
  amountCharged?: number; // Total amount charged for the session
  readerRatePerMinute?: number; // Reader's rate at the time of session booking
}

export interface ChatMessage {
  id: string; // Unique ID for each message
  senderUid: string;
  senderName: string;
  text: string;
  timestamp: string; // ISO string for DataChannel, or Firestore Timestamp for DB
  isOwn: boolean; // For UI differentiation, determined client-side
}

export interface OpponentInfo {
  uid: string;
  name: string;
  profileImage?: string | null;
  ratePerMinute?: number;
  stripeAccountId?: string;
}