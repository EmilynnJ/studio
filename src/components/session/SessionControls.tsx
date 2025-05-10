'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Video, Mic, MicOff, VideoOff, PhoneOff } from 'lucide-react';
import type { SessionType, CallStatus } from '@/types/session';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface SessionControlsProps {
  sessionType: SessionType;
  isMuted: boolean;
  isVideoOff: boolean;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onHangUp: () => void;
  callStatus: CallStatus;
  mediaPermissionsGranted: boolean; // True if permissions granted or not needed (chat)
  hasAudioTrack: boolean; // True if local stream has an audio track
  hasVideoTrack: boolean; // True if local stream has a video track
}

export function SessionControls({
  sessionType,
  isMuted,
  isVideoOff,
  onToggleMute,
  onToggleVideo,
  onHangUp,
  callStatus,
  mediaPermissionsGranted,
  hasAudioTrack,
  hasVideoTrack,
}: SessionControlsProps) {
  
  const isMediaSession = sessionType === 'video' || sessionType === 'audio';
  // Controls should be enabled if permissions are granted (or not needed for chat) AND call is in a state where media can be controlled.
  const canControlMedia = mediaPermissionsGranted && (callStatus === 'connected' || callStatus === 'connecting' || callStatus === 'permission_granted');
  const canHangUp = callStatus !== 'ended' && callStatus !== 'error' && callStatus !== 'idle' && callStatus !== 'loading_session';

  return (
    <div className="mt-6 sm:mt-8 flex flex-wrap justify-center items-center gap-2 sm:gap-3 md:gap-4">
      {isMediaSession && (
        <Button
          onClick={onToggleMute}
          variant="outline"
          size="default"
          className="border-[hsl(var(--primary))] text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)] px-3 py-2 sm:px-4"
          disabled={!canControlMedia || !hasAudioTrack} // Disable if no audio track
          title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
          aria-pressed={isMuted}
        >
          {isMuted ? <MicOff className="h-5 w-5 sm:h-6 sm:w-6" /> : <Mic className="h-5 w-5 sm:h-6 sm:w-6" />}
          <span className="ml-1 sm:ml-2 font-playfair-display text-xs sm:text-sm hidden sm:inline">
            {isMuted ? 'Unmute' : 'Mute'}
          </span>
        </Button>
      )}
      {sessionType === 'video' && (
        <Button
          onClick={onToggleVideo}
          variant="outline"
          size="default"
          className="border-[hsl(var(--primary))] text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)] px-3 py-2 sm:px-4"
          disabled={!canControlMedia || !hasVideoTrack} // Disable if no video track
          title={isVideoOff ? 'Turn Camera On' : 'Turn Camera Off'}
          aria-pressed={isVideoOff}
        >
          {isVideoOff ? <VideoOff className="h-5 w-5 sm:h-6 sm:w-6" /> : <Video className="h-5 w-5 sm:h-6 sm:w-6" />}
          <span className="ml-1 sm:ml-2 font-playfair-display text-xs sm:text-sm hidden sm:inline">
            {isVideoOff ? 'Video On' : 'Video Off'}
          </span>
        </Button>
      )}
      
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="destructive"
            size="default"
            className="px-3 py-2 sm:px-4"
            disabled={!canHangUp}
            title="End Session"
          >
            <PhoneOff className="h-5 w-5 sm:h-6 sm:w-6" />
            <span className="ml-1 sm:ml-2 font-playfair-display text-xs sm:text-sm">End Session</span>
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-alex-brush text-[hsl(var(--soulseer-header-pink))] text-2xl">End Session?</AlertDialogTitle>
            <AlertDialogDescription className="font-playfair-display text-foreground/80">
              Are you sure you want to end this session? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-playfair-display">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onHangUp} className="font-playfair-display bg-destructive text-destructive-foreground hover:bg-destructive/90">
              End Session
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
