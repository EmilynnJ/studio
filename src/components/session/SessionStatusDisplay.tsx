
'use client';

import React from 'react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2, AlertTriangle, Clock, DollarSign, UserCircle2, Hourglass, WifiOff, Users, Info } from 'lucide-react';
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
  let StatusIcon: React.ElementType = Info; 
  let titleMessage = `${sessionType.charAt(0).toUpperCase() + sessionType.slice(1)} Session`;
  let alertVariant: "default" | "destructive" | null | undefined = undefined;
  let titleClass = "font-alex-brush text-2xl sm:text-3xl text-[hsl(var(--soulseer-header-pink))] page-title-text"; // Ensure Alex Brush styling with halo

  if (opponent?.name) {
    titleMessage += ` with ${opponent.name}`;
  }


  // Initial loading state before sessionData is available or fully processed
  if (callStatus === 'idle' || callStatus === 'loading_session' || !sessionData) {
    return (
      <div className="container mx-auto px-4 py-12 flex flex-col items-center justify-center min-h-[calc(50vh)]">
        <Loader2 className="h-12 w-12 sm:h-16 sm:w-16 animate-spin text-[hsl(var(--primary))]" />
        <p className="mt-4 text-base sm:text-lg font-playfair-display text-foreground/80">
          Initializing Session...
        </p>
      </div>
    );
  }
  
  // Handle specific session statuses from Firestore data first
  switch (sessionData.status) {
    case 'pending':
      StatusIcon = Hourglass;
      titleMessage = `Pending ${sessionType} Session`;
      if (currentUser?.uid === sessionData.clientUid) {
        statusMessage = `Waiting for ${sessionData.readerName || 'Reader'} to accept your ${sessionType} request...`;
      } else if (currentUser?.uid === sessionData.readerUid) {
        statusMessage = `Incoming ${sessionType} request from ${sessionData.clientName || 'Client'}. Please accept or decline via your dashboard.`;
      }
      break;
    case 'accepted_by_reader':
      if (callStatus !== 'connected' && callStatus !== 'connecting') {
        titleMessage = `Preparing ${sessionType} Session`;
        statusMessage = `${sessionData.readerName || 'Reader'} accepted. Establishing connection...`;
        StatusIcon = Loader2;
      }
      break;
    case 'ended':
    case 'ended_insufficient_funds':
    case 'cancelled':
      titleMessage = sessionData.status === 'ended_insufficient_funds' ? 'Session Ended: Low Balance' : 
                     sessionData.status === 'cancelled' ? 'Session Cancelled' : `Session Ended`;
      StatusIcon = sessionData.status === 'ended_insufficient_funds' || sessionData.status === 'cancelled' ? AlertTriangle : CheckCircle;
      alertVariant = sessionData.status === 'ended_insufficient_funds' || sessionData.status === 'cancelled' ? 'destructive' : 'default';
      // UI for ended session is handled below in a specific Alert
      break;
  }

  // Handle WebRTC call statuses, potentially overriding previous messages if more current
  switch (callStatus) {
    case 'waiting_permission':
      if (isMediaSession) {
        titleMessage = `Preparing ${sessionType} Session`;
        statusMessage = 'Requesting media permissions...';
        StatusIcon = Loader2;
      }
      break;
    case 'permission_granted':
      if (isMediaSession && sessionData.status !== 'active') { // active status handled by default title
        titleMessage = `Preparing ${sessionType} Session`;
        statusMessage = 'Permissions granted. Establishing connection...';
        StatusIcon = Loader2;
      }
      break;
    case 'connecting':
      titleMessage = `Connecting ${sessionType} Session`;
      statusMessage = `Attempting to connect with ${opponent?.name || 'participant'}...`;
      StatusIcon = Loader2;
      break;
    case 'connected':
      // Title already includes opponent name, status message can be minimal or celebratory
      StatusIcon = Users;
      statusMessage = `Connected for ${sessionType} session.`;
      break;
    case 'disconnected':
      titleMessage = `Reconnecting ${sessionType} Session`;
      statusMessage = 'Connection lost. Attempting to reconnect...';
      StatusIcon = WifiOff;
      alertVariant = "destructive";
      break;
    case 'error':
      // This will be handled by the specific error Alert below if not an 'ended_insufficient_funds' case
      if (sessionData.status !== 'ended_insufficient_funds') {
        titleMessage = 'Session Error';
        statusMessage = 'An unexpected error occurred with the session.';
        StatusIcon = AlertTriangle;
        alertVariant = "destructive";
      }
      break;
  }

  // Handle media permission denial specifically
  if (mediaPermissionsStatus === 'denied' && isMediaSession) {
    const permTitle = "Media Permissions Required";
    const permDescription = sessionType === 'audio'
        ? "Please grant permissions to your microphone. You may need to adjust your browser settings."
        : "Please grant permissions to your camera and/or microphone. You may need to adjust your browser settings.";
     return (
        <Alert variant="destructive" className="max-w-md mt-4 sm:mt-6 mx-auto">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle className={titleClass}>{permTitle}</AlertTitle>
          <AlertDescription className="font-playfair-display">{permDescription}</AlertDescription>
          <Button onClick={() => router.push('/dashboard')} className="mt-4 w-full">Go to Dashboard</Button>
        </Alert>
    );
  }
  
  // Generic error display if callStatus is 'error' and not already handled by a specific session status
  if (callStatus === 'error' && sessionData.status !== 'ended_insufficient_funds' && sessionData.status !== 'ended' && sessionData.status !== 'cancelled') {
     return (
        <Alert variant="destructive" className="max-w-md mt-4 sm:mt-6 mx-auto">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle className={titleClass}>Session Error</AlertTitle>
          <AlertDescription className="font-playfair-display">There was an issue with the session. Please try again or contact support.</AlertDescription>
          <Button onClick={() => router.push('/dashboard')} className="mt-4 w-full">Go to Dashboard</Button>
        </Alert>
    );
  }

  // Display for active or post-session states
  const isSessionEffectivelyOver = sessionData.status === 'ended' || sessionData.status === 'ended_insufficient_funds' || sessionData.status === 'cancelled';

  return (
    <>
      <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-[hsl(var(--card)/0.7)] rounded-lg border border-[hsl(var(--border)/0.5)] shadow-md text-center">
        <p className={titleClass}>
          {titleMessage}
        </p>
        {(callStatus === 'connected' || (isSessionEffectivelyOver && sessionData.startedAt)) && (
          <div className="font-playfair-display text-base sm:text-lg mt-1 sm:mt-2 space-y-0.5 sm:space-y-1">
            <p className="text-[hsl(var(--accent))]">
              <Clock className="inline-block h-4 w-4 sm:h-5 sm:w-5 mr-1.5 align-text-bottom" />
              Session Time: {formatTime(sessionTimer)}
            </p>
            {sessionData.readerRatePerMinute !== undefined && (
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
                        Amount Charged This Session: ${currentAmountCharged.toFixed(2)}
                    </p>
                )}
                </>
            )}
          </div>
        )}
        {/* Show status message for ongoing non-connected states */}
        {statusMessage && !isSessionEffectivelyOver && callStatus !== 'connected' && (
          <div className="flex items-center justify-center gap-2 font-playfair-display text-sm sm:text-base mt-1 sm:mt-2">
            <StatusIcon className={`h-4 w-4 sm:h-5 sm:w-5 text-foreground/80 ${StatusIcon === Loader2 ? 'animate-spin': ''} ${callStatus === 'disconnected' || callStatus === 'error' ? 'text-destructive' : ''}`} />
            <p className={`${callStatus === 'disconnected' || callStatus === 'error' ? 'text-destructive' : 'text-foreground/80'} ${callStatus === 'connecting' || StatusIcon === Loader2 ? 'animate-pulse' : ''}`}>
              {statusMessage}
            </p>
          </div>
        )}
      </div>

      {/* Post-session summary alert */}
      {isSessionEffectivelyOver && (
        <Alert className="mt-6 sm:mt-8 max-w-md mx-auto bg-[hsl(var(--card))] border-[hsl(var(--border)/0.7)]" variant={alertVariant}>
          {StatusIcon === AlertTriangle ? <AlertTriangle className="h-5 w-5" /> : <CheckCircle className="h-5 w-5 text-green-500" />}
          <AlertTitle className={titleClass}>
            {titleMessage} {/* Title is already set for ended states */}
            </AlertTitle>
          <AlertDescription className="font-playfair-display text-sm sm:text-base text-foreground/80">
            The session has concluded. 
            {sessionData.startedAt && <span> Total time: {formatTime(sessionData.totalMinutes ? sessionData.totalMinutes * 60 : sessionTimer)}.</span>}
            {typeof sessionData.amountCharged === 'number' && (
              <span className="block mt-1">Total Amount Charged: ${sessionData.amountCharged.toFixed(2)}</span>
            )}
             {sessionData.status === 'ended_insufficient_funds' && <span className="block mt-1">Please top up your balance to continue using our services.</span>}
             {sessionData.status === 'cancelled' && <span className="block mt-1">This session was cancelled.</span>}
          </AlertDescription>
          <Button onClick={() => router.push('/dashboard')} className="mt-4 w-full">Back to Dashboard</Button>
        </Alert>
      )}
    </>
  );
}

