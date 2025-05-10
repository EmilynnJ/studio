
'use client';

import React from 'react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2, AlertTriangle, UserCheck, Clock, DollarSign, UserCircle } from 'lucide-react'; // Added Clock, DollarSign, UserCircle
import type { CallStatus, SessionType, VideoSessionData, OpponentInfo } from '@/types/session';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';

interface SessionStatusDisplayProps {
  sessionType: SessionType;
  callStatus: CallStatus;
  sessionTimer: number;
  opponent: OpponentInfo | null;
  sessionData: VideoSessionData | null;
  mediaPermissionsStatus: 'prompt' | 'granted' | 'denied' | 'not_needed';
}

const formatTime = (totalSeconds: number): string => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

export function SessionStatusDisplay({
  sessionType,
  callStatus,
  sessionTimer,
  opponent,
  sessionData,
  mediaPermissionsStatus,
}: SessionStatusDisplayProps) {
  const router = useRouter();
  const { currentUser } = useAuth();
  const isMediaSession = sessionType === 'video' || sessionType === 'audio';

  let statusMessage = '';
  let titleMessage = `${sessionType.charAt(0).toUpperCase() + sessionType.slice(1)} Session with ${opponent?.name || 'Participant'}`;

  if (callStatus === 'loading_session') {
    statusMessage = 'Loading session details...';
    titleMessage = 'Initializing Session';
  } else if (currentUser && sessionData) {
    if (sessionData.status === 'pending' && currentUser.uid === sessionData.clientUid) {
      statusMessage = `Waiting for ${sessionData.readerName || 'Reader'} to accept your request...`;
      titleMessage = `Pending ${sessionType} Session`;
    } else if ((sessionData.status === 'accepted_by_reader' || sessionData.status === 'pending' && currentUser.uid === sessionData.readerUid) && callStatus !== 'connected') {
       statusMessage = `Connecting with ${currentUser.uid === sessionData.readerUid ? sessionData.clientName : sessionData.readerName}...`;
       titleMessage = `Preparing ${sessionType} Session`;
    }
  }
  
  if (callStatus === 'waiting_permission' && isMediaSession && !statusMessage) {
    statusMessage = 'Requesting media permissions...';
  } else if (callStatus === 'permission_granted' && isMediaSession && callStatus !== 'connecting' && callStatus !== 'connected' && !statusMessage) {
    statusMessage = 'Permissions granted, establishing connection...';
  } else if (callStatus === 'connecting' && !statusMessage) {
    statusMessage = `Attempting to connect to ${opponent?.name || 'participant'}...`;
  } else if (callStatus === 'disconnected') {
    statusMessage = 'Connection lost. Attempting to reconnect...';
  }


  if (callStatus === 'idle' || callStatus === 'loading_session' || (callStatus === 'waiting_permission' && isMediaSession) || (callStatus === 'permission_granted' && isMediaSession && callStatus !== 'connecting' && callStatus !== 'connected') && !((sessionData?.status === 'pending' || sessionData?.status === 'accepted_by_reader') && callStatus !== 'connected')) {
    return (
      <div className="container mx-auto px-4 py-12 flex flex-col items-center justify-center min-h-[calc(100vh-var(--header-height,10rem)-var(--footer-height,10rem))]">
        <Loader2 className="h-12 w-12 sm:h-16 sm:w-16 animate-spin text-[hsl(var(--primary))]" />
        <p className="mt-4 text-base sm:text-lg font-playfair-display text-foreground/80">
          {statusMessage || 'Initializing...'}
        </p>
      </div>
    );
  }
  
  if (mediaPermissionsStatus === 'denied' && isMediaSession) {
    const permTitle = "Media Permissions Required";
    const permDescription = sessionType === 'audio'
        ? "Please grant permissions to your microphone. You may need to adjust your browser settings."
        : "Please grant permissions to your camera and/or microphone. You may need to adjust your browser settings.";
     return (
        <Alert variant="destructive" className="max-w-md mt-4 sm:mt-6 mx-auto">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle>{permTitle}</AlertTitle>
          <AlertDescription>{permDescription}</AlertDescription>
          <Button onClick={() => router.push('/dashboard')} className="mt-4 w-full">Go to Dashboard</Button>
        </Alert>
    );
  }

  if (callStatus === 'error') {
     return (
        <Alert variant="destructive" className="max-w-md mt-4 sm:mt-6 mx-auto">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle>Session Error</AlertTitle>
          <AlertDescription>There was an issue with the session. Please try again or contact support.</AlertDescription>
          <Button onClick={() => router.push('/dashboard')} className="mt-4 w-full">Go to Dashboard</Button>
        </Alert>
    );
  }


  return (
    <>
      <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-[hsl(var(--card)/0.7)] rounded-lg border border-[hsl(var(--border)/0.5)] shadow-md text-center">
        <p className="font-alex-brush text-2xl sm:text-3xl text-[hsl(var(--soulseer-header-pink))]">
          {titleMessage}
        </p>
        {(callStatus === 'connected' || (callStatus === 'ended' && sessionData?.startedAt)) && (
          <div className="font-playfair-display text-lg sm:text-xl mt-1 sm:mt-2 space-y-0.5 sm:space-y-1">
            <p className="text-[hsl(var(--accent))]">
              <Clock className="inline-block h-5 w-5 mr-1.5 align-text-bottom" />
              Session Time: {formatTime(sessionTimer)}
            </p>
            {sessionData?.readerRatePerMinute !== undefined && (
              <p className="text-sm text-foreground/80">
                <DollarSign className="inline-block h-4 w-4 mr-1 align-text-bottom" />
                Rate: ${sessionData.readerRatePerMinute.toFixed(2)}/min
              </p>
            )}
            {currentUser?.role === 'client' && ( // Only show balance placeholder to client for now
                <p className="text-sm text-foreground/80">
                    <UserCircle className="inline-block h-4 w-4 mr-1 align-text-bottom" />
                    Your Balance: $XX.XX <span className="text-xs">(Billing not active)</span>
                </p>
            )}
          </div>
        )}
        {statusMessage && (callStatus === 'connecting' || callStatus === 'disconnected' || (sessionData?.status === 'pending' || sessionData?.status === 'accepted_by_reader')  && callStatus !== 'connected') && (
          <div className="flex items-center justify-center gap-2 font-playfair-display text-sm sm:text-base mt-1 sm:mt-2">
            {(callStatus === 'connecting' || (sessionData?.status === 'accepted_by_reader' && callStatus !== 'connected')) && <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin text-foreground/80" />}
            {sessionData?.status === 'pending' && currentUser?.uid === sessionData.clientUid && <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-foreground/80" />}
             <p className={`${callStatus === 'disconnected' ? 'text-destructive' : 'text-foreground/80'} ${callStatus === 'connecting' ? 'animate-pulse' : ''}`}>
              {statusMessage}
            </p>
          </div>
        )}
      </div>

      {callStatus === 'ended' && sessionData?.status === 'ended' && (
        <Alert className="mt-6 sm:mt-8 max-w-md mx-auto bg-[hsl(var(--card))] border-[hsl(var(--border)/0.7)]">
          <CheckCircle className="h-5 w-5 text-green-500" />
          <AlertTitle className="font-alex-brush text-lg sm:text-xl text-[hsl(var(--soulseer-header-pink))]">Session Ended</AlertTitle>
          <AlertDescription className="font-playfair-display text-sm sm:text-base text-foreground/80">
            The session has concluded. Total time: {formatTime(sessionData.totalMinutes ? sessionData.totalMinutes * 60 : sessionTimer)}.
            {sessionData.readerRatePerMinute !== undefined && sessionData.totalMinutes !== undefined && (
              <span className="block mt-1">Amount (Placeholder): ${(sessionData.readerRatePerMinute * sessionData.totalMinutes).toFixed(2)}</span>
            )}
          </AlertDescription>
          <Button onClick={() => router.push('/dashboard')} className="mt-4 w-full">Back to Dashboard</Button>
        </Alert>
      )}
    </>
  );
}
