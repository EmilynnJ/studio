'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useWebRTC } from '@/components/session/WebRTCProvider';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import VideoDisplay from '@/components/session/VideoDisplay';
import ChatInterface from '@/components/session/ChatInterface';
import PreCallChecks from '@/components/session/PreCallChecks';
import PostCallSummary from '@/components/session/PostCallSummary';
import SessionInfo from '@/components/session/SessionInfo';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import type { SessionType, OpponentInfo } from '@/types/session';

enum SessionStage {
  LOADING,
  PRE_CALL,
  IN_CALL,
  POST_CALL,
  ERROR
}

export default function SessionPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const { initializeCall, callStatus, endCall } = useWebRTC();
  
  const [sessionStage, setSessionStage] = useState<SessionStage>(SessionStage.LOADING);
  const [sessionData, setSessionData] = useState<{
    sessionType: SessionType;
    opponentInfo: OpponentInfo;
    isInitiator: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(true);
  
  // Fetch session data
  useEffect(() => {
    const fetchSessionData = async () => {
      try {
        if (!currentUser) {
          setError('You must be logged in to join a session');
          setSessionStage(SessionStage.ERROR);
          return;
        }
        
        const response = await fetch(`/api/sessions/${sessionId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch session data');
        }
        
        const data = await response.json();
        const session = data.session;
        
        // Determine if current user is reader or client
        const isReader = currentUser.uid === session.readerId;
        const isClient = currentUser.uid === session.clientId;
        
        if (!isReader && !isClient) {
          setError('You are not authorized to join this session');
          setSessionStage(SessionStage.ERROR);
          return;
        }
        
        // Set opponent info based on user role
        const opponentInfo: OpponentInfo = isReader 
          ? {
              uid: session.clientId,
              name: session.client.name,
              profileImage: session.client.profileImage || null
            }
          : {
              uid: session.readerId,
              name: session.reader.name,
              profileImage: session.reader.profileImage || null,
              ratePerMinute: session.reader.ratePerMinute
            };
        
        // Set session data
        setSessionData({
          sessionType: (session.type || 'VIDEO').toLowerCase() as SessionType,
          opponentInfo,
          isInitiator: isReader // Reader is the initiator
        });
        
        setSessionStage(SessionStage.PRE_CALL);
      } catch (error) {
        console.error('Error fetching session data:', error);
        setError('Failed to load session data. Please try again.');
        setSessionStage(SessionStage.ERROR);
      }
    };
    
    fetchSessionData();
  }, [sessionId, currentUser]);
  
  // Handle call status changes
  useEffect(() => {
    if (callStatus === 'ended') {
      setSessionStage(SessionStage.POST_CALL);
    }
  }, [callStatus]);
  
  // Start the call
  const handleStartCall = async () => {
    if (!sessionData) return;
    
    try {
      await initializeCall(
        sessionId,
        sessionData.sessionType,
        sessionData.opponentInfo,
        sessionData.isInitiator
      );
      
      setSessionStage(SessionStage.IN_CALL);
    } catch (error) {
      console.error('Error starting call:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to Start Session',
        description: error instanceof Error ? error.message : 'An unknown error occurred'
      });
    }
  };
  
  // Cancel the call
  const handleCancelCall = () => {
    endCall();
    setSessionStage(SessionStage.POST_CALL);
  };
  
  // Toggle chat visibility
  const handleToggleChat = () => {
    setShowChat(prev => !prev);
  };
  
  // Render based on session stage
  const renderContent = () => {
    switch (sessionStage) {
      case SessionStage.LOADING:
        return (
          <Card className="w-full max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="text-center">Loading Session</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center p-8">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p>Preparing your session...</p>
            </CardContent>
          </Card>
        );
        
      case SessionStage.PRE_CALL:
        return (
          <PreCallChecks 
            onReady={handleStartCall} 
            onCancel={handleCancelCall} 
          />
        );
        
      case SessionStage.IN_CALL:
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">
            <div className={showChat ? 'md:col-span-2' : 'md:col-span-3'}>
              <VideoDisplay 
                showChat={showChat} 
                onToggleChat={handleToggleChat} 
              />
            </div>
            
            {showChat && (
              <div className="md:col-span-1">
                <ChatInterface />
              </div>
            )}
            
            <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-background/80 backdrop-blur-sm p-2 rounded-lg shadow-lg">
              <SessionInfo />
            </div>
          </div>
        );
        
      case SessionStage.POST_CALL:
        return (
          <PostCallSummary sessionId={sessionId} />
        );
        
      case SessionStage.ERROR:
        return (
          <Card className="w-full max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="text-center text-red-500">Error</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center p-8">
              <p className="mb-4">{error || 'An unknown error occurred'}</p>
              <Button onClick={() => window.history.back()}>Go Back</Button>
            </CardContent>
          </Card>
        );
        
      default:
        return null;
    }
  };
  
  return (
    <div className="container mx-auto py-6 h-[calc(100vh-80px)]">
      {renderContent()}
    </div>
  );
}