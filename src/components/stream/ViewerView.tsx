
'use client';

import React, { useRef, useEffect } from 'react';
import { Users, Loader2, WifiOff } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface StreamerInfo {
  name: string;
  photoURL?: string | null;
  // Add other relevant streamer details if available
}

interface ViewerViewProps {
  streamer: StreamerInfo;
  remoteStream: MediaStream | null;
  viewerCount: number;
}

const ViewerView: React.FC<ViewerViewProps> = ({ streamer, remoteStream, viewerCount }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (remoteStream && videoRef.current) {
      videoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);
  
  const getInitials = (name: string | null | undefined): string => {
    if (!name) return 'S';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <div className="flex flex-col h-full">
      <Card className="mb-4 bg-muted/50 border-border/30">
        <CardContent className="p-3 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="bg-red-600 animate-pulse w-3 h-3 rounded-full shadow-md border border-red-800"></div>
            <span className="font-semibold text-sm text-foreground font-playfair-display">LIVE</span>
            <span className="text-muted-foreground">•</span>
            <Avatar className="h-6 w-6">
                <AvatarImage src={streamer?.photoURL || undefined} alt={streamer?.name || 'Streamer'} />
                <AvatarFallback className="text-xs bg-muted-foreground/20 text-foreground">{getInitials(streamer?.name)}</AvatarFallback>
            </Avatar>
            <span className="font-semibold text-sm text-foreground truncate max-w-[100px] sm:max-w-[150px] font-playfair-display">
              {streamer?.name || 'Streamer'}
            </span>
          </div>
          <div className="flex items-center text-xs sm:text-sm">
            <Users className="h-4 w-4 mr-1.5 text-muted-foreground" />
            <span className="font-semibold text-foreground font-playfair-display">{viewerCount}</span>
            <span className="text-muted-foreground ml-1 font-playfair-display">watching</span>
          </div>
        </CardContent>
      </Card>

      <div className="relative flex-1 bg-black rounded-lg overflow-hidden shadow-2xl border border-border/20">
        {remoteStream ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-muted text-muted-foreground">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-lg font-playfair-display">Connecting to stream...</p>
            <p className="text-sm font-playfair-display">Waiting for {streamer?.name || 'the streamer'} to start.</p>
          </div>
        )}
         <div className="absolute top-3 left-3 bg-red-600 text-white px-2.5 py-1 rounded-md text-xs font-semibold shadow-md font-playfair-display">
          LIVE
        </div>
      </div>
    </div>
  );
};

export default ViewerView;
