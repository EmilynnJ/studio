
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Video, Mic, MicOff, VideoOff, PhoneOff } from 'lucide-react';
import type { SessionType, CallStatus } from '@/types/session';

interface SessionControlsProps {
  sessionType: SessionType;
  isMuted: boolean;
  isVideoOff: boolean;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onHangUp: () => void;
  callStatus: CallStatus;
  mediaPermissionsGranted: boolean;
  hasAudioTrack: boolean;
  hasVideoTrack: boolean;
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
  const canControlMedia = (callStatus === 'connected' || callStatus === 'connecting') && mediaPermissionsGranted;

  return (
    <div className="mt-6 sm:mt-8 flex flex-wrap justify-center items-center gap-2 sm:gap-3 md:gap-4">
      {isMediaSession && (
        <Button
          onClick={onToggleMute}
          variant="outline"
          size="default"
          className="border-[hsl(var(--primary))] text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)] px-3 py-2 sm:px-4"
          disabled={!canControlMedia || !hasAudioTrack}
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
          disabled={!canControlMedia || !hasVideoTrack}
          title={isVideoOff ? 'Turn Camera On' : 'Turn Camera Off'}
          aria-pressed={isVideoOff}
        >
          {isVideoOff ? <VideoOff className="h-5 w-5 sm:h-6 sm:w-6" /> : <Video className="h-5 w-5 sm:h-6 sm:w-6" />}
          <span className="ml-1 sm:ml-2 font-playfair-display text-xs sm:text-sm hidden sm:inline">
            {isVideoOff ? 'Video On' : 'Video Off'}
          </span>
        </Button>
      )}
      <Button
        onClick={onHangUp}
        variant="destructive"
        size="default"
        className="px-3 py-2 sm:px-4"
        disabled={callStatus === 'ended' || callStatus === 'error'}
        title="End Session"
      >
        <PhoneOff className="h-5 w-5 sm:h-6 sm:w-6" />
        <span className="ml-1 sm:ml-2 font-playfair-display text-xs sm:text-sm">End Session</span>
      </Button>
    </div>
  );
}
