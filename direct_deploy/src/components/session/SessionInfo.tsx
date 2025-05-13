'use client';

import React from 'react';
import { useWebRTC } from './WebRTCProvider';
import { useAuth } from '@/contexts/auth-context';
import { Badge } from '@/components/ui/badge';

const SessionInfo: React.FC = () => {
  const { billingStatus, opponentInfo, sessionType } = useWebRTC();
  const { currentUser } = useAuth();
  
  // Format time from milliseconds to MM:SS
  const formatTime = (ms: number | null): string => {
    if (!ms) return '00:00';
    
    const totalSeconds = Math.floor((Date.now() - ms) / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };
  
  // Get session type badge
  const getSessionTypeBadge = () => {
    switch (sessionType) {
      case 'video':
        return <Badge variant="outline" className="bg-blue-100">Video</Badge>;
      case 'audio':
        return <Badge variant="outline" className="bg-green-100">Audio</Badge>;
      case 'chat':
        return <Badge variant="outline" className="bg-purple-100">Chat</Badge>;
      default:
        return null;
    }
  };
  
  return (
    <div className="flex flex-col">
      <div className="flex items-center space-x-2">
        <span className="font-medium">
          {opponentInfo?.name || 'Unknown'}
        </span>
        {getSessionTypeBadge()}
      </div>
      
      <div className="flex items-center space-x-4 text-sm text-gray-500">
        {/* Session timer */}
        <div>
          {billingStatus.startTime ? (
            <span>Duration: {formatTime(billingStatus.startTime)}</span>
          ) : (
            <span>Not started</span>
          )}
        </div>
        
        {/* Rate info */}
        {billingStatus.ratePerMinute !== null && (
          <div>
            Rate: ${billingStatus.ratePerMinute}/min
          </div>
        )}
        
        {/* Balance info for clients */}
        {currentUser?.role === 'client' && billingStatus.currentBalance !== null && (
          <div>
            Balance: ${billingStatus.currentBalance.toFixed(2)}
          </div>
        )}
        
        {/* Remaining time for clients */}
        {currentUser?.role === 'client' && billingStatus.remainingMinutes !== null && (
          <div>
            Remaining: ~{billingStatus.remainingMinutes} min
          </div>
        )}
      </div>
    </div>
  );
};

export default SessionInfo;