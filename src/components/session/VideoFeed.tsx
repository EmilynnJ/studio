
'use client';

import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import type { CallStatus, SessionType } from '@/types/session';
import type { AppUser } from '@/types/user';

interface VideoFeedProps {
  title: string;
  videoRef: React.RefObject<HTMLVideoElement> | null;
  isLocal: boolean;
  mediaStream: MediaStream | null;
  userInfo?: Pick<AppUser, 'name' | 'photoURL'> | null;
  isMuted?: boolean;
  isVideoOff?: boolean; // For local user
  isRemoteVideoOff?: boolean; // For remote user actual state
  sessionType: SessionType;
  callStatus: CallStatus;
}

const getInitials = (name: string | null | undefined): string => {
  if (!name) return '??';
  return name.split(' ').map(n => n[0]).join('').toUpperCase();
};

export function VideoFeed({
  title,
  videoRef,
  isLocal,
  mediaStream,
  userInfo,
  isMuted,
  isVideoOff,
  isRemoteVideoOff,
  sessionType,
  callStatus,
}: VideoFeedProps) {
  
  const isVideoCurrentlyRendered = isLocal ? !isVideoOff : !isRemoteVideoOff;
  const showVideoElement = sessionType === 'video' && isVideoCurrentlyRendered && mediaStream && mediaStream.getVideoTracks().some(t => t.enabled && !t.muted);
  const showAvatar = (sessionType !== 'video' || !isVideoCurrentlyRendered || !mediaStream || mediaStream.getVideoTracks().every(t => !t.enabled || t.muted));

  const currentName = userInfo?.name || (isLocal ? 'You' : 'Participant');

  return (
    <Card className="bg-[hsl(var(--card))] border-[hsl(var(--border)/0.7)] shadow-xl relative overflow-hidden w-full">
      <CardHeader className="py-2 px-3 sm:py-3 sm:px-4">
        <CardTitle className="text-base sm:text-lg font-alex-brush text-[hsl(var(--soulseer-header-pink))]">
          {title} {sessionType === 'audio' && "(Audio Only)"}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-2 sm:p-3">
        <div className="aspect-video bg-black rounded-md overflow-hidden flex items-center justify-center relative">
          {sessionType === 'video' && (
            <video 
              ref={videoRef} 
              className={`w-full h-full object-cover ${showVideoElement ? 'block' : 'hidden'}`} 
              autoPlay 
              playsInline 
              muted={isLocal} 
            />
          )}
          {showAvatar && (
            <Avatar className="w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 text-4xl sm:text-5xl md:text-6xl">
              <AvatarImage src={userInfo?.photoURL || undefined} alt={currentName || 'User'} />
              <AvatarFallback className="bg-muted text-muted-foreground">{getInitials(currentName)}</AvatarFallback>
            </Avatar>
          )}

          {(!isLocal && callStatus === 'connecting' && sessionType !== 'chat' && (!mediaStream || mediaStream.getVideoTracks().length === 0)) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 p-2">
              <Loader2 className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 animate-spin text-[hsl(var(--primary))]" />
              <p className="mt-2 sm:mt-3 text-white font-playfair-display text-xs sm:text-sm text-center">
                Connecting to {userInfo?.name || 'participant'}...
              </p>
            </div>
          )}
          
          {isLocal && isVideoOff && sessionType === 'video' && (
            <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-xs font-playfair-display">Video Off</div>
          )}
          {isLocal && isMuted && (sessionType === 'video' || sessionType === 'audio') && (
            <div className="absolute bottom-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-xs font-playfair-display">Muted</div>
          )}
          {!isLocal && isRemoteVideoOff && sessionType === 'video' && callStatus === 'connected' && (
            <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-xs font-playfair-display">{userInfo?.name || 'Participant'}&apos;s Video Off</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
