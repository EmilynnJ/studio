'use client';

import React from 'react';
import { useWebRTC } from './WebRTCProvider';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Video, VideoOff, PhoneOff, MessageSquare } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface VideoControlsProps {
  showChat: boolean;
  onToggleChat: () => void;
}

const VideoControls: React.FC<VideoControlsProps> = ({ showChat, onToggleChat }) => {
  const { 
    sessionType, 
    isMuted, 
    isVideoOff, 
    toggleMute, 
    toggleVideo, 
    endCall,
    callStatus
  } = useWebRTC();
  
  const isConnected = callStatus === 'connected';
  
  return (
    <div className="flex items-center justify-center space-x-2 bg-gray-900 bg-opacity-80 p-3 rounded-full">
      <TooltipProvider>
        {/* Mute button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isMuted ? "destructive" : "secondary"}
              size="icon"
              onClick={toggleMute}
              disabled={!isConnected}
              className="rounded-full h-10 w-10"
            >
              {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
          </TooltipContent>
        </Tooltip>
        
        {/* Video toggle button (only for video calls) */}
        {sessionType === 'video' && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isVideoOff ? "destructive" : "secondary"}
                size="icon"
                onClick={toggleVideo}
                disabled={!isConnected}
                className="rounded-full h-10 w-10"
              >
                {isVideoOff ? <VideoOff size={20} /> : <Video size={20} />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isVideoOff ? 'Turn On Camera' : 'Turn Off Camera'}
            </TooltipContent>
          </Tooltip>
        )}
        
        {/* Chat toggle button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={showChat ? "default" : "secondary"}
              size="icon"
              onClick={onToggleChat}
              className="rounded-full h-10 w-10"
            >
              <MessageSquare size={20} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {showChat ? 'Hide Chat' : 'Show Chat'}
          </TooltipContent>
        </Tooltip>
        
        {/* End call button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="destructive"
              size="icon"
              onClick={endCall}
              className="rounded-full h-10 w-10"
            >
              <PhoneOff size={20} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            End Session
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

export default VideoControls;