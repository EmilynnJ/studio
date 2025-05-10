'use client';

import React from 'react';
import { Clock, DollarSign, UserCircle2 } from 'lucide-react';
import type { AppUser } from '@/types/user'; // Assuming AppUser type
import type { VideoSessionData } from '@/types/session'; // Assuming VideoSessionData type

interface BillingStatus {
  startTime?: number;
  currentBalance?: number;
  ratePerMinute?: number;
  remainingMinutes?: number;
  totalBilled?: number;
  totalMinutes?: number;
  endTime?: number;
  reason?: string;
}

interface SessionInfoProps {
  sessionData: VideoSessionData | null;
  billingStatus: BillingStatus | null;
  userRole: AppUser['role']; // 'client' | 'reader' | null
  elapsedTime?: string; // Optional, if passed directly
}

const SessionInfo: React.FC<SessionInfoProps> = ({ sessionData, billingStatus, userRole, elapsedTime }) => {
  if (!sessionData) return null;

  const { readerName, clientName, sessionType, readerRatePerMinute } = sessionData;
  const isClient = userRole === 'client';
  const opponentName = isClient ? readerName : clientName;

  const formatCurrency = (amountInDollars?: number) => {
    if (typeof amountInDollars !== 'number') return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amountInDollars);
  };
  
  const calculatedElapsedTime = () => {
    if (elapsedTime) return elapsedTime;
    if (billingStatus?.startTime) {
      const now = billingStatus.endTime || Date.now();
      const seconds = Math.floor((now - billingStatus.startTime) / 1000);
      const min = Math.floor(seconds / 60).toString().padStart(2, '0');
      const sec = (seconds % 60).toString().padStart(2, '0');
      return `${min}:${sec}`;
    }
    return '00:00';
  };


  return (
    <div className="bg-[hsl(var(--card)/0.7)] border-b border-[hsl(var(--border)/0.5)] p-3 sm:p-4 backdrop-blur-sm rounded-t-lg">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-4">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[hsl(var(--primary)/0.2)] flex items-center justify-center">
              <span className="font-alex-brush text-2xl text-[hsl(var(--primary))]">{opponentName?.charAt(0) || '?'}</span>
            </div>
          </div>
          <div>
            <h2 className="font-alex-brush text-xl sm:text-2xl text-[hsl(var(--soulseer-header-pink))]">{opponentName || 'Participant'}</h2>
            <p className="text-xs sm:text-sm text-muted-foreground font-playfair-display">
              {sessionType.charAt(0).toUpperCase() + sessionType.slice(1)} Session
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 sm:space-x-6 text-xs sm:text-sm font-playfair-display">
          <div className="flex items-center text-foreground/90">
            <Clock className="h-4 w-4 mr-1.5 text-[hsl(var(--accent))]" />
            <span>{calculatedElapsedTime()}</span>
          </div>

          {isClient && billingStatus && typeof billingStatus.currentBalance === 'number' && (
            <div className="flex items-center text-foreground/90">
              <UserCircle2 className="h-4 w-4 mr-1.5 text-[hsl(var(--accent))]" />
              <span>Balance: {formatCurrency(billingStatus.currentBalance)}</span>
            </div>
          )}
          
           {isClient && billingStatus && typeof billingStatus.remainingMinutes === 'number' && (
            <div className="flex items-center text-muted-foreground">
              <span>({billingStatus.remainingMinutes} min left)</span>
            </div>
          )}

          {readerRatePerMinute !== undefined && (
            <div className="flex items-center text-foreground/90">
              <DollarSign className="h-4 w-4 mr-1.5 text-[hsl(var(--accent))]" />
              <span>{formatCurrency(readerRatePerMinute)}/min</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SessionInfo;
