
'use client';

import React, { useRef, useEffect } from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Users, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface StreamerViewProps {
  localStream: MediaStream | null;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  toggleAudio: () => void;
  toggleVideo: () => void;
  endStream: () => void;
  viewerCount: number;
  earnings: number; // in cents
}

const StreamerView: React.FC<StreamerViewProps> = ({
  localStream,
  isAudioEnabled,
  isVideoEnabled,
  toggleAudio,
  toggleVideo,
  endStream,
  viewerCount,
  earnings,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (localStream && videoRef.current) {
      videoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  const formatCurrency = (amountInCents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amountInCents / 100);
  };

  return (
    <div className="flex flex-col h-full">
      <Card className="mb-4 bg-muted/50 border-border/30">
        <CardContent className="p-3 flex justify-between items-center">
          <div className="flex items-center">
            <div className="bg-red-600 animate-pulse w-3 h-3 rounded-full mr-2 shadow-md border border-red-800"></div>
            <span className="font-semibold text-sm text-foreground font-playfair-display">LIVE</span>
          </div>

          <div className="flex items-center space-x-4 sm:space-x-6">
            <div className="flex items-center text-xs sm:text-sm">
              <Users className="h-4 w-4 mr-1.5 text-muted-foreground" />
              <span className="font-semibold text-foreground font-playfair-display">{viewerCount}</span>
              <span className="text-muted-foreground ml-1 font-playfair-display">viewers</span>
            </div>
            <div className="flex items-center text-xs sm:text-sm">
              <DollarSign className="h-4 w-4 mr-1.5 text-muted-foreground" />
              <span className="font-semibold text-foreground font-playfair-display">{formatCurrency(earnings)}</span>
              <span className="text-muted-foreground ml-1 font-playfair-display">earned</span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="relative flex-1 bg-black rounded-lg overflow-hidden mb-4 shadow-2xl border border-border/20">
        {localStream && isVideoEnabled ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted // Local video should always be muted to prevent echo
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-muted text-muted-foreground">
            <VideoOff className="h-16 w-16 mb-4" />
            <p className="text-lg font-playfair-display">{isVideoEnabled ? "Starting camera..." : "Camera is off"}</p>
          </div>
        )}
         <div className="absolute top-3 left-3 bg-red-600 text-white px-2.5 py-1 rounded-md text-xs font-semibold shadow-md font-playfair-display">
          YOU ARE LIVE
        </div>
      </div>

      <div className="flex justify-center items-center gap-3 sm:gap-4 p-3 bg-card/70 rounded-lg shadow-md border border-border/30 backdrop-blur-sm">
        <Button
          variant={isAudioEnabled ? "outline" : "destructive"}
          size="icon"
          onClick={toggleAudio}
          className="h-10 w-10 sm:h-12 sm:w-12 rounded-full border-primary text-primary hover:bg-primary/10 data-[variant=destructive]:bg-destructive data-[variant=destructive]:text-destructive-foreground"
          title={isAudioEnabled ? "Mute Microphone" : "Unmute Microphone"}
        >
          {isAudioEnabled ? <Mic className="h-5 w-5 sm:h-6 sm:w-6" /> : <MicOff className="h-5 w-5 sm:h-6 sm:w-6" />}
        </Button>
        <Button
          variant={isVideoEnabled ? "outline" : "destructive"}
          size="icon"
          onClick={toggleVideo}
          className="h-10 w-10 sm:h-12 sm:w-12 rounded-full border-primary text-primary hover:bg-primary/10 data-[variant=destructive]:bg-destructive data-[variant=destructive]:text-destructive-foreground"
          title={isVideoEnabled ? "Turn Camera Off" : "Turn Camera On"}
        >
          {isVideoEnabled ? <Video className="h-5 w-5 sm:h-6 sm:w-6" /> : <VideoOff className="h-5 w-5 sm:h-6 sm:w-6" />}
        </Button>
        <Button
          variant="destructive"
          size="icon"
          onClick={endStream}
          className="h-10 w-10 sm:h-12 sm:w-12 rounded-full"
          title="End Stream"
        >
          <PhoneOff className="h-5 w-5 sm:h-6 sm:w-6" />
        </Button>
      </div>
    </div>
  );
};

export default StreamerView;
