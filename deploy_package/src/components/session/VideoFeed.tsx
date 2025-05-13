'use client';

import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, VideoOff as VideoOffIcon, MicOff as MicOffIcon } from 'lucide-react';
import type { CallStatus, SessionType } from '@/types/session';
import type { AppUser } from '@/types/user';

interface VideoFeedProps {
  title: string;
  videoRef: React.RefObject<HTMLVideoElement> | null;
  isLocal: boolean;
  mediaStream: MediaStream | null;
  userInfo?: Pick<AppUser, 'name' | 'photoURL'> | null;
  isMuted?: boolean;
  isVideoOff?: boolean; // For local user's intended video state
  isRemoteVideoOff?: boolean; // For remote user's actual video track state
  sessionType: SessionType;
  callStatus: CallStatus;
}

const getInitials = (name: string | null | undefined): string => {
  if (!name) return isLocal ? 'YOU' : '??';
  return name.split(' ').map(n => n[0]).join('').toUpperCase();
};

export function VideoFeed({
  title,
  videoRef,
  isLocal,
  mediaStream,
  userInfo,
  isMuted,
  isVideoOff, // Local user's intended state (e.g., camera button pressed)
  isRemoteVideoOff, // Actual state of remote video track
  sessionType,
  callStatus,
}: VideoFeedProps) {
  
  // Determine if video should be rendered based on session type and actual track availability/state
  const videoTrackAvailableAndEnabled = mediaStream?.getVideoTracks().some(track => track.readyState === 'live' && track.enabled);
  
  // Local video display logic
  const showLocalVideo = isLocal && sessionType === 'video' && !isVideoOff && videoTrackAvailableAndEnabled;
  // Remote video display logic
  const showRemoteVideo = !isLocal && sessionType === 'video' && !isRemoteVideoOff && videoTrackAvailableAndEnabled;

  const showVideoElement = showLocalVideo || showRemoteVideo;
  
  // Avatar is shown if it's not a video session, or if video is off/unavailable for the current user (local or remote)
  const showAvatar = 
    sessionType === 'chat' || 
    sessionType === 'audio' || 
    (sessionType === 'video' && !showVideoElement) ||
    (sessionType === 'video' && isLocal && isVideoOff) ||
    (sessionType === 'video' && !isLocal && isRemoteVideoOff);


  const currentName = userInfo?.name || (isLocal ? 'You' : 'Participant');

  return (
    <Card className="bg-[hsl(var(--card))] border-[hsl(var(--border)/0.7)] shadow-xl relative overflow-hidden w-full">
      <CardHeader className="py-2 px-3 sm:py-3 sm:px-4">
        <CardTitle className="text-base sm:text-lg font-alex-brush text-[hsl(var(--soulseer-header-pink))] truncate">
          {title} {sessionType === 'audio' && callStatus === 'connected' && "(Audio Only)"}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-2 sm:p-3">
        <div className="aspect-video bg-black rounded-md overflow-hidden flex items-center justify-center relative text-foreground">
          {sessionType === 'video' && (
            <video 
              ref={videoRef} 
              className={`w-full h-full object-cover transition-opacity duration-300 ${showVideoElement ? 'opacity-100 block' : 'opacity-0 hidden'}`} 
              autoPlay 
              playsInline 
              muted={isLocal} // Local video is always muted to prevent echo
            />
          )}

          {showAvatar && (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <Avatar className="w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 text-4xl sm:text-5xl md:text-6xl border-2 border-[hsl(var(--primary)/0.5)]">
                <AvatarImage src={userInfo?.photoURL || undefined} alt={currentName} />
                <AvatarFallback className="bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]">{getInitials(currentName)}</AvatarFallback>
              </Avatar>
              {sessionType === 'audio' && callStatus === 'connected' && (
                <p className="mt-2 text-sm font-playfair-display text-muted-foreground">Audio Only</p>
              )}
            </div>
          )}

          {/* Connecting State Overlay - more prominent for remote */}
          {(!isLocal && (callStatus === 'connecting' || (callStatus === 'permission_granted' && sessionType !== 'chat' && !mediaStream) ) && !showVideoElement && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 p-2 z-10">
              <Loader2 className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:h-12 animate-spin text-[hsl(var(--primary))]" />
              <p className="mt-2 sm:mt-3 text-white font-playfair-display text-xs sm:text-sm text-center">
                Connecting to {currentName}...
              </p>
            </div>
          ))}
          
          {/* Status Indicators */}
          <div className="absolute bottom-2 right-2 flex flex-col items-end gap-1 z-20">
            {isLocal && isVideoOff && sessionType === 'video' && (
              <div className="bg-black/60 text-white px-2 py-1 rounded text-xs font-playfair-display flex items-center gap-1">
                <VideoOffIcon className="w-3 h-3" /> Video Off
              </div>
            )}
            {isLocal && isMuted && isMediaSession && (
              <div className="bg-black/60 text-white px-2 py-1 rounded text-xs font-playfair-display flex items-center gap-1">
                <MicOffIcon className="w-3 h-3" /> Muted
              </div>
            )}
          </div>
          <div className="absolute bottom-2 left-2 z-20">
            {!isLocal && isRemoteVideoOff && sessionType === 'video' && callStatus === 'connected' && (
              <div className="bg-black/60 text-white px-2 py-1 rounded text-xs font-playfair-display flex items-center gap-1">
                <VideoOffIcon className="w-3 h-3" /> {currentName}'s Video Off
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
