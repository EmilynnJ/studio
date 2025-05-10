'use client';

import React from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Settings } from 'lucide-react'; // Added Settings
import { Button } from '@/components/ui/button';

interface VideoControlsProps {
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onEndCall: () => void; // Changed from endSession to onEndCall
  onOpenSettings?: (type: 'audio' | 'video') => void; // Optional: for device settings
}


const VideoControls: React.FC<VideoControlsProps> = ({ 
  isAudioEnabled, 
  isVideoEnabled, 
  onToggleAudio, 
  onToggleVideo, 
  onEndCall,
  onOpenSettings
}) => {
  return (
    <div className="flex justify-center items-center gap-3 sm:gap-4 p-3 bg-[hsl(var(--card)/0.8)] rounded-lg shadow-md mt-4 backdrop-blur-sm">
      <Button
        variant={isAudioEnabled ? "outline" : "destructive"}
        size="icon"
        onClick={onToggleAudio}
        className="h-10 w-10 sm:h-12 sm:w-12 rounded-full border-[hsl(var(--primary))] text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)] data-[variant=destructive]:bg-destructive data-[variant=destructive]:text-destructive-foreground"
        title={isAudioEnabled ? "Mute Microphone" : "Unmute Microphone"}
      >
        {isAudioEnabled ? <Mic className="h-5 w-5 sm:h-6 sm:w-6" /> : <MicOff className="h-5 w-5 sm:h-6 sm:w-6" />}
      </Button>

      <Button
        variant={isVideoEnabled ? "outline" : "destructive"}
        size="icon"
        onClick={onToggleVideo}
        className="h-10 w-10 sm:h-12 sm:w-12 rounded-full border-[hsl(var(--primary))] text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)] data-[variant=destructive]:bg-destructive data-[variant=destructive]:text-destructive-foreground"
        title={isVideoEnabled ? "Turn Camera Off" : "Turn Camera On"}
      >
        {isVideoEnabled ? <Video className="h-5 w-5 sm:h-6 sm:w-6" /> : <VideoOff className="h-5 w-5 sm:h-6 sm:w-6" />}
      </Button>
      
      {onOpenSettings && (
         <Button
            variant="outline"
            size="icon"
            onClick={() => onOpenSettings('audio')} // Could be a dropdown for audio/video
            className="h-10 w-10 sm:h-12 sm:w-12 rounded-full border-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted)/0.1)]"
            title="Device Settings"
        >
            <Settings className="h-5 w-5 sm:h-6 sm:w-6" />
        </Button>
      )}

      <Button
        variant="destructive"
        size="icon"
        onClick={onEndCall} 
        className="h-10 w-10 sm:h-12 sm:w-12 rounded-full"
        title="End Session"
      >
        <PhoneOff className="h-5 w-5 sm:h-6 sm:w-6" />
      </Button>
    </div>
  );
};

export default VideoControls;
