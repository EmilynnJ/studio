'use client';

import React, { useEffect, useRef } from 'react';
import { useWebRTC } from './WebRTCProvider';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Video, VideoOff, PhoneOff } from 'lucide-react';
import ChatInterface from './ChatInterface';
import SessionInfo from './SessionInfo';

interface VideoCallProps {
  sessionId: string;
}

const VideoCall: React.FC<VideoCallProps> = ({ sessionId }) => {
  const { 
    localStream, 
    remoteStream, 
    callStatus, 
    sessionType,
    isMuted,
    isVideoOff,
    toggleMute,
    toggleVideo,
    endCall,
    billingStatus
  } = useWebRTC();
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  
  // Set up local video stream
  useEffect(() => {
    if (localVideoRef.current && localStream && sessionType === 'video' && !isVideoOff) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, sessionType, isVideoOff]);
  
  // Set up remote video stream
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);
  
  // Render different UI based on call status
  const renderCallStatus = () => {
    switch (callStatus) {
      case 'idle':
        return <div className="text-center">Call not initialized</div>;
      case 'loading_session':
        return <div className="text-center">Loading session...</div>;
      case 'waiting_permission':
        return <div className="text-center">Waiting for camera/microphone permission...</div>;
      case 'permission_granted':
        return <div className="text-center">Permission granted, connecting...</div>;
      case 'connecting':
        return <div className="text-center">Connecting to peer...</div>;
      case 'disconnected':
        return <div className="text-center">Connection lost. Attempting to reconnect...</div>;
      case 'error':
        return <div className="text-center text-red-500">Error connecting to peer</div>;
      case 'ended':
        return <div className="text-center">Call ended</div>;
      default:
        return null;
    }
  };
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">
      <div className="md:col-span-2">
        <Card className="h-full flex flex-col">
          <div className="flex-grow relative">
            {/* Remote Video (Main) */}
            {sessionType === 'video' && (
              <div className="w-full h-full bg-black rounded-t-lg overflow-hidden">
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                
                {/* Call status overlay */}
                {callStatus !== 'connected' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 text-white">
                    {renderCallStatus()}
                  </div>
                )}
                
                {/* Local Video (Picture-in-Picture) */}
                <div className="absolute bottom-4 right-4 w-1/4 h-1/4 bg-gray-900 rounded-lg overflow-hidden border-2 border-white">
                  {isVideoOff ? (
                    <div className="w-full h-full flex items-center justify-center bg-gray-800 text-white">
                      <VideoOff size={24} />
                    </div>
                  ) : (
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              </div>
            )}
            
            {/* Audio-only UI */}
            {sessionType === 'audio' && (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900 to-pink-700 rounded-t-lg">
                <div className="text-center text-white">
                  <div className="text-2xl font-bold mb-4">Audio Call</div>
                  {callStatus !== 'connected' ? (
                    renderCallStatus()
                  ) : (
                    <div className="animate-pulse">
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Chat-only UI */}
            {sessionType === 'chat' && (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-900 to-purple-700 rounded-t-lg">
                <div className="text-center text-white">
                  <div className="text-2xl font-bold mb-4">Chat Session</div>
                  {callStatus !== 'connected' ? (
                    renderCallStatus()
                  ) : (
                    <div>Connected - Use the chat panel to communicate</div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* Controls */}
          <div className="p-4 flex items-center justify-between bg-gray-100 rounded-b-lg">
            <SessionInfo />
            
            <div className="flex items-center space-x-4">
              {/* Mute button */}
              <Button
                variant="outline"
                size="icon"
                onClick={toggleMute}
                disabled={callStatus !== 'connected'}
                className={isMuted ? 'bg-red-100' : ''}
              >
                {isMuted ? <MicOff /> : <Mic />}
              </Button>
              
              {/* Video toggle button (only for video calls) */}
              {sessionType === 'video' && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={toggleVideo}
                  disabled={callStatus !== 'connected'}
                  className={isVideoOff ? 'bg-red-100' : ''}
                >
                  {isVideoOff ? <VideoOff /> : <Video />}
                </Button>
              )}
              
              {/* End call button */}
              <Button
                variant="destructive"
                size="icon"
                onClick={endCall}
              >
                <PhoneOff />
              </Button>
            </div>
          </div>
        </Card>
      </div>
      
      {/* Chat panel */}
      <div className="md:col-span-1">
        <ChatInterface />
      </div>
    </div>
  );
};

export default VideoCall;