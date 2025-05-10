'use client';

import React, { useRef, useEffect } from 'react';
import { Loader2, VideoOff as VideoOffIcon } from 'lucide-react'; // Assuming VideoOff is an icon for when video is disabled
import type { RTCIceConnectionState } from 'webrtc'; // For connectionState typing

interface VideoDisplayProps {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isLocalAudioEnabled?: boolean; // For potential future use (displaying mute icon)
  isLocalVideoEnabled?: boolean; // To show if local user has turned off their camera
  isConnecting?: boolean; // Derived from a general status prop typically
  connectionState?: RTCIceConnectionState | 'new' | 'checking' | 'connecting' | 'connected' | 'disconnected' | 'failed' | 'closed'; // More comprehensive
}

const VideoDisplay: React.FC<VideoDisplayProps> = ({ 
  localStream, 
  remoteStream, 
  isLocalVideoEnabled = true,
  isConnecting, 
  connectionState 
}) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    } else if (!remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null; // Clear if remote stream is removed
    }
  }, [remoteStream]);

  const showRemoteConnectingLoader = isConnecting || connectionState === 'connecting' || connectionState === 'checking';

  return (
    <div className="relative w-full h-full bg-[hsl(var(--muted))] rounded-lg overflow-hidden shadow-inner aspect-video">
      {/* Remote video (main) */}
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        className={`w-full h-full object-cover transition-opacity duration-300 ${remoteStream ? 'opacity-100' : 'opacity-0'}`}
      />
      {!remoteStream && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
          {showRemoteConnectingLoader ? (
            <>
              <Loader2 className="h-10 w-10 sm:h-12 sm:w-12 animate-spin text-[hsl(var(--primary))] mb-3 sm:mb-4" />
              <p className="text-md sm:text-lg font-playfair-display text-foreground/90">Connecting...</p>
              <p className="text-xs sm:text-sm text-muted-foreground font-playfair-display">
                {connectionState === 'checking' ? 'Establishing secure connection...' : 
                 connectionState === 'connecting' ? 'Connection in progress...' :
                 'Waiting for the other participant...'}
              </p>
            </>
          ) : (
            <>
              <VideoOffIcon className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-3 sm:mb-4" />
              <p className="text-md sm:text-lg font-playfair-display text-foreground/90">Waiting for video...</p>
              <p className="text-xs sm:text-sm text-muted-foreground font-playfair-display">The other participant's video is not available.</p>
            </>
          )}
        </div>
      )}

      {/* Local video (picture-in-picture style) */}
      {localStream && (
        <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 w-1/4 max-w-[180px] min-w-[100px] aspect-video rounded-md overflow-hidden border-2 border-[hsl(var(--background)/0.5)] shadow-lg bg-black">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover transition-opacity duration-300 ${isLocalVideoEnabled ? 'opacity-100' : 'opacity-30'}`}
          />
          {!isLocalVideoEnabled && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70">
              <VideoOffIcon className="h-6 w-6 text-white/80" />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VideoDisplay;
