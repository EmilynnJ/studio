'use client';

import React from 'react';
import { useWebRTC } from './WebRTCProvider';
import { Loader2, AlertCircle, CheckCircle, WifiOff } from 'lucide-react';

const SessionStatusDisplay: React.FC = () => {
  const { callStatus } = useWebRTC();
  
  // Render different UI based on call status
  switch (callStatus) {
    case 'idle':
      return (
        <div className="flex flex-col items-center">
          <AlertCircle className="h-10 w-10 mb-2 text-yellow-400" />
          <div className="text-center">
            <p className="text-lg font-medium">Session Not Initialized</p>
            <p className="text-sm opacity-70">Waiting to start the session</p>
          </div>
        </div>
      );
      
    case 'loading_session':
      return (
        <div className="flex flex-col items-center">
          <Loader2 className="h-10 w-10 mb-2 animate-spin text-blue-400" />
          <div className="text-center">
            <p className="text-lg font-medium">Loading Session</p>
            <p className="text-sm opacity-70">Preparing your session...</p>
          </div>
        </div>
      );
      
    case 'waiting_permission':
      return (
        <div className="flex flex-col items-center">
          <Loader2 className="h-10 w-10 mb-2 animate-spin text-blue-400" />
          <div className="text-center">
            <p className="text-lg font-medium">Waiting for Permissions</p>
            <p className="text-sm opacity-70">Please allow access to your camera and microphone</p>
          </div>
        </div>
      );
      
    case 'permission_granted':
      return (
        <div className="flex flex-col items-center">
          <CheckCircle className="h-10 w-10 mb-2 text-green-400" />
          <div className="text-center">
            <p className="text-lg font-medium">Permissions Granted</p>
            <p className="text-sm opacity-70">Connecting to your session...</p>
          </div>
        </div>
      );
      
    case 'connecting':
      return (
        <div className="flex flex-col items-center">
          <Loader2 className="h-10 w-10 mb-2 animate-spin text-blue-400" />
          <div className="text-center">
            <p className="text-lg font-medium">Connecting</p>
            <p className="text-sm opacity-70">Establishing secure connection...</p>
          </div>
        </div>
      );
      
    case 'disconnected':
      return (
        <div className="flex flex-col items-center">
          <WifiOff className="h-10 w-10 mb-2 text-yellow-400" />
          <div className="text-center">
            <p className="text-lg font-medium">Connection Lost</p>
            <p className="text-sm opacity-70">Attempting to reconnect...</p>
          </div>
        </div>
      );
      
    case 'error':
      return (
        <div className="flex flex-col items-center">
          <AlertCircle className="h-10 w-10 mb-2 text-red-500" />
          <div className="text-center">
            <p className="text-lg font-medium">Connection Error</p>
            <p className="text-sm opacity-70">Unable to establish connection</p>
          </div>
        </div>
      );
      
    case 'ended':
      return (
        <div className="flex flex-col items-center">
          <CheckCircle className="h-10 w-10 mb-2 text-green-400" />
          <div className="text-center">
            <p className="text-lg font-medium">Session Ended</p>
            <p className="text-sm opacity-70">Thank you for using SoulSeer</p>
          </div>
        </div>
      );
      
    default:
      return null;
  }
};

export default SessionStatusDisplay;