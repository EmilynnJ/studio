
'use client';

import React from 'react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2, AlertTriangle } from 'lucide-react';
import type { CallStatus, SessionType, VideoSessionData, OpponentInfo } from '@/types/session';
import { useRouter } from 'next/navigation';

interface SessionStatusDisplayProps {
  sessionType: SessionType;
  callStatus: CallStatus;
  sessionTimer: number;
  opponent: OpponentInfo | null;
  sessionData: VideoSessionData | null; // For ended state
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
  const isMediaSession = sessionType === 'video' || sessionType === 'audio';

  let statusMessage = '';
  if (callStatus === 'loading_session') statusMessage = 'Loading session details...';
  else if (callStatus === 'waiting_permission' && isMediaSession) statusMessage = 'Preparing session & requesting permissions...';
  else if (callStatus === 'permission_granted' && isMediaSession) statusMessage = 'Permissions granted, initializing connection...';
  else if (callStatus === 'connecting') statusMessage = `Attempting to connect to ${opponent?.name || 'participant'}...`;
  else if (callStatus === 'disconnected') statusMessage = 'Connection lost. Attempting to reconnect...';

  if (callStatus === 'idle' || callStatus === 'loading_session' || (callStatus === 'waiting_permission' && isMediaSession) || (callStatus === 'permission_granted' && isMediaSession && callStatus !== 'connecting' && callStatus !== 'connected')) {
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
    const title = "Media Permissions Required";
    const description = sessionType === 'audio'
        ? "Please grant permissions to your microphone. You may need to adjust your browser settings."
        : "Please grant permissions to your camera and/or microphone. You may need to adjust your browser settings.";
     return (
        <Alert variant="destructive" className="max-w-md mt-4 sm:mt-6 mx-auto">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle>{title}</AlertTitle>
          <AlertDescription>{description}</AlertDescription>
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
          {sessionType.charAt(0).toUpperCase() + sessionType.slice(1)} Session with {opponent?.name || 'Participant'}
        </p>
        {(callStatus === 'connected' || (callStatus === 'ended' && sessionData?.startedAt)) && (
          <p className="font-playfair-display text-xl sm:text-2xl text-[hsl(var(--accent))] mt-1 sm:mt-2">
            Session Time: {formatTime(sessionTimer)}
          </p>
        )}
        {statusMessage && (callStatus === 'connecting' || callStatus === 'disconnected') && (
          <p className={`font-playfair-display text-base sm:text-lg ${callStatus === 'disconnected' ? 'text-destructive' : 'text-foreground/80'} mt-1 sm:mt-2 ${callStatus === 'connecting' ? 'animate-pulse' : ''}`}>
            {statusMessage}
          </p>
        )}
      </div>

      {callStatus === 'ended' && sessionData?.status === 'ended' && (
        <Alert className="mt-6 sm:mt-8 max-w-md mx-auto bg-[hsl(var(--card))] border-[hsl(var(--border)/0.7)]">
          <CheckCircle className="h-5 w-5 text-green-500" />
          <AlertTitle className="font-alex-brush text-lg sm:text-xl text-[hsl(var(--soulseer-header-pink))]">Session Ended</AlertTitle>
          <AlertDescription className="font-playfair-display text-sm sm:text-base text-foreground/80">
            The session has concluded. Total time: {formatTime(sessionData.totalMinutes ? sessionData.totalMinutes * 60 : sessionTimer)}.
          </AlertDescription>
          <Button onClick={() => router.push('/dashboard')} className="mt-4 w-full">Back to Dashboard</Button>
        </Alert>
      )}
    </>
  );
}
