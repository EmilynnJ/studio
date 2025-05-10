
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
  status: 'pending' | 'accepted_by_reader' | 'active' | 'ended' | 'cancelled';
  requestedAt: Timestamp;
  startedAt?: Timestamp;
  endedAt?: Timestamp;
  sessionType: SessionType;
  totalMinutes?: number;
  amountCharged?: number;
  readerRatePerMinute?: number; // Added reader's rate for the session
}

export interface ChatMessage {
  id: string; // Unique ID for each message
  senderUid: string;
  senderName: string;
  text: string;
  timestamp: string; // ISO string for DataChannel, or Firestore Timestamp for DB
  isOwn: boolean; // For UI differentiation, determined client-side
}

export interface OpponentInfo extends Pick<AppUser, 'name' | 'uid' | 'photoURL'> {}


