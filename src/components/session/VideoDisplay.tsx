'use client';

import React, { useEffect, useRef } from 'react';
import { useWebRTC } from './WebRTCProvider';
import { Card } from '@/components/ui/card';
import { VideoOff, UserX } from 'lucide-react';
import VideoControls from './VideoControls';
import SessionStatusDisplay from './SessionStatusDisplay';

interface VideoDisplayProps {
  showChat: boolean;
  onToggleChat: () => void;
}

const VideoDisplay: React.FC<VideoDisplayProps> = ({ showChat, onToggleChat }) => {
  const { 
    localStream, 
    remoteStream, 
    callStatus, 
    sessionType,
    isVideoOff,
    opponentInfo
  } = useWebRTC();
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  
  // Set up local video stream
  useEffect(() => {
    if (localVideoRef.current && localStream && sessionType === 'video' && !isVideoOff) {
      localVideoRef.current.srcObject = localStream;
    } else if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
  }, [localStream, sessionType, isVideoOff]);
  
  // Set up remote video stream
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    } else if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
  }, [remoteStream]);
  
  // Render different UI based on session type
  const renderSessionContent = () => {
    if (sessionType === 'video') {
      return (
        <div className="relative w-full h-full bg-black rounded-lg overflow-hidden">
          {/* Remote Video (Main) */}
          {remoteStream && callStatus === 'connected' ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 text-white">
              <UserX size={64} className="mb-4 opacity-50" />
              <p className="text-lg font-medium">{opponentInfo?.name || 'Peer'} is not connected</p>
              <p className="text-sm opacity-70">Waiting for video...</p>
            </div>
          )}
          
          {/* Call status overlay */}
          {callStatus !== 'connected' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70 text-white z-10">
              <SessionStatusDisplay />
            </div>
          )}
          
          {/* Local Video (Picture-in-Picture) */}
          <div className="absolute bottom-20 right-4 w-1/4 h-1/4 bg-gray-900 rounded-lg overflow-hidden border-2 border-white shadow-lg z-20">
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
          
          {/* Controls */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20">
            <VideoControls showChat={showChat} onToggleChat={onToggleChat} />
          </div>
        </div>
      );
    } else if (sessionType === 'audio') {
      return (
        <div className="relative w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900 to-pink-700 rounded-lg">
          <div className="text-center text-white">
            <div className="mb-8">
              <div className="w-24 h-24 rounded-full bg-white/20 mx-auto flex items-center justify-center">
                <span className="text-3xl font-bold">{opponentInfo?.name?.[0] || '?'}</span>
              </div>
              <h2 className="mt-4 text-2xl font-bold">{opponentInfo?.name || 'Anonymous'}</h2>
              <p className="text-white/70">Audio Call</p>
            </div>
            
            {callStatus === 'connected' ? (
              <div className="animate-pulse">
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            ) : (
              <SessionStatusDisplay />
            )}
          </div>
          
          {/* Controls */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
            <VideoControls showChat={showChat} onToggleChat={onToggleChat} />
          </div>
        </div>
      );
    } else { // Chat-only
      return (
        <div className="relative w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-900 to-purple-700 rounded-lg">
          <div className="text-center text-white">
            <div className="mb-8">
              <div className="w-24 h-24 rounded-full bg-white/20 mx-auto flex items-center justify-center">
                <span className="text-3xl font-bold">{opponentInfo?.name?.[0] || '?'}</span>
              </div>
              <h2 className="mt-4 text-2xl font-bold">{opponentInfo?.name || 'Anonymous'}</h2>
              <p className="text-white/70">Chat Session</p>
            </div>
            
            {callStatus === 'connected' ? (
              <p>Connected - Use the chat panel to communicate</p>
            ) : (
              <SessionStatusDisplay />
            )}
          </div>
          
          {/* Controls */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
            <VideoControls showChat={showChat} onToggleChat={onToggleChat} />
          </div>
        </div>
      );
    }
  };
  
  return (
    <Card className="h-full w-full overflow-hidden">
      {renderSessionContent()}
    </Card>
  );
};

export default VideoDisplay;