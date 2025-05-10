
'use client';

import React from 'react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2, AlertTriangle, Clock, DollarSign, UserCircle2, Hourglass, WifiOff } from 'lucide-react';
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
  clientBalance?: number; 
  currentAmountCharged?: number; 
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
  clientBalance,
  currentAmountCharged,
}: SessionStatusDisplayProps) {
  const router = useRouter();
  const { currentUser } = useAuth();
  const isMediaSession = sessionType === 'video' || sessionType === 'audio';

  let statusMessage = '';
  let StatusIcon = Loader2;
  let titleMessage = `${sessionType.charAt(0).toUpperCase() + sessionType.slice(1)} Session with ${opponent?.name || 'Participant'}`;

  if (callStatus === 'loading_session') {
    statusMessage = 'Loading session details...';
    titleMessage = 'Initializing Session';
    StatusIcon = Loader2;
  } else if (currentUser && sessionData) {
    if (sessionData.status === 'pending' && currentUser.uid === sessionData.clientUid && callStatus !== 'connected') {
      statusMessage = `Waiting for ${sessionData.readerName || 'Reader'} to accept your request...`;
      titleMessage = `Pending ${sessionType} Session`;
      StatusIcon = Hourglass;
    } else if (sessionData.status === 'pending' && currentUser.uid === sessionData.readerUid && callStatus !== 'connected') {
      statusMessage = `Incoming ${sessionType} request from ${sessionData.clientName}. Accept via dashboard.`;
      titleMessage = `Incoming ${sessionType} Request`;
      StatusIcon = Hourglass; // Or a specific icon for incoming request
    } else if (sessionData.status === 'accepted_by_reader' && callStatus !== 'connected') {
       statusMessage = `Connecting with ${currentUser.uid === sessionData.readerUid ? sessionData.clientName : sessionData.readerName}...`;
       titleMessage = `Preparing ${sessionType} Session`;
       StatusIcon = Loader2;
    }
  }
  
  if (callStatus === 'waiting_permission' && isMediaSession && !statusMessage) {
    statusMessage = 'Requesting media permissions...';
    StatusIcon = Loader2;
  } else if (callStatus === 'permission_granted' && isMediaSession && callStatus !== 'connecting' && callStatus !== 'connected' && !statusMessage) {
    statusMessage = 'Permissions granted, establishing connection...';
    StatusIcon = Loader2;
  } else if (callStatus === 'connecting' && !statusMessage) {
    statusMessage = `Attempting to connect to ${opponent?.name || 'participant'}...`;
    StatusIcon = Loader2;
  } else if (callStatus === 'disconnected') {
    statusMessage = 'Connection lost. Attempting to reconnect...';
    StatusIcon = WifiOff;
  }


  if (callStatus === 'idle' || callStatus === 'loading_session' || (callStatus === 'waiting_permission' && isMediaSession) || (callStatus === 'permission_granted' && isMediaSession && callStatus !== 'connecting' && callStatus !== 'connected') && !(sessionData?.status === 'pending' && callStatus !== 'connected') && !(sessionData?.status === 'accepted_by_reader' && callStatus !== 'connected')) {
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

  if (callStatus === 'error' && sessionData?.status !== 'ended_insufficient_funds') { 
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
        {(callStatus === 'connected' || ( (sessionData?.status === 'ended' || sessionData?.status === 'ended_insufficient_funds') && sessionData?.startedAt)) && (
          <div className="font-playfair-display text-base sm:text-lg mt-1 sm:mt-2 space-y-0.5 sm:space-y-1">
            <p className="text-[hsl(var(--accent))]">
              <Clock className="inline-block h-4 w-4 sm:h-5 sm:w-5 mr-1.5 align-text-bottom" />
              Session Time: {formatTime(sessionTimer)}
            </p>
            {sessionData?.readerRatePerMinute !== undefined && (
              <p className="text-sm sm:text-base text-foreground/80">
                <DollarSign className="inline-block h-4 w-4 sm:h-5 sm:w-5 mr-1 align-text-bottom" />
                Reader's Rate: ${sessionData.readerRatePerMinute.toFixed(2)}/min
              </p>
            )}
            {currentUser?.role === 'client' && (
                <>
                {typeof clientBalance === 'number' && (
                    <p className="text-sm sm:text-base text-foreground/80">
                        <UserCircle2 className="inline-block h-4 w-4 sm:h-5 sm:w-5 mr-1 align-text-bottom" />
                        Your Balance: ${clientBalance.toFixed(2)}
                    </p>
                )}
                {typeof currentAmountCharged === 'number' && currentAmountCharged > 0 && (
                     <p className="text-sm sm:text-base text-foreground/70">
                        Amount Charged: ${currentAmountCharged.toFixed(2)}
                    </p>
                )}
                </>
            )}
          </div>
        )}
        {statusMessage && (callStatus === 'connecting' || callStatus === 'disconnected' || (sessionData?.status === 'pending' && callStatus !== 'connected') || (sessionData?.status === 'accepted_by_reader' && callStatus !== 'connected')) && (
          <div className="flex items-center justify-center gap-2 font-playfair-display text-sm sm:text-base mt-1 sm:mt-2">
            <StatusIcon className={`h-4 w-4 sm:h-5 sm:w-5 text-foreground/80 ${StatusIcon === Loader2 ? 'animate-spin': ''}`} />
            <p className={`${callStatus === 'disconnected' ? 'text-destructive' : 'text-foreground/80'} ${callStatus === 'connecting' ? 'animate-pulse' : ''}`}>
              {statusMessage}
            </p>
          </div>
        )}
      </div>

      {(sessionData?.status === 'ended' || sessionData?.status === 'ended_insufficient_funds') && (
        <Alert className="mt-6 sm:mt-8 max-w-md mx-auto bg-[hsl(var(--card))] border-[hsl(var(--border)/0.7)]" variant={sessionData.status === 'ended_insufficient_funds' ? 'destructive' : 'default'}>
          {sessionData.status === 'ended_insufficient_funds' ? <AlertTriangle className="h-5 w-5" /> : <CheckCircle className="h-5 w-5 text-green-500" />}
          <AlertTitle className="font-alex-brush text-lg sm:text-xl text-[hsl(var(--soulseer-header-pink))]">
            {sessionData.status === 'ended_insufficient_funds' ? 'Session Ended: Insufficient Funds' : 'Session Ended'}
            </AlertTitle>
          <AlertDescription className="font-playfair-display text-sm sm:text-base text-foreground/80">
            The session has concluded. Total time: {formatTime(sessionData.totalMinutes ? sessionData.totalMinutes * 60 : sessionTimer)}.
            {typeof sessionData.amountCharged === 'number' && (
              <span className="block mt-1">Total Amount Charged: ${sessionData.amountCharged.toFixed(2)}</span>
            )}
             {sessionData.status === 'ended_insufficient_funds' && <span className="block mt-1">Please top up your balance to continue using our services.</span>}
          </AlertDescription>
          <Button onClick={() => router.push('/dashboard')} className="mt-4 w-full">Back to Dashboard</Button>
        </Alert>
      )}
    </>
  );
}

