'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/auth-context';
import WebRTCService from '@/services/webRTCService';
import socketService from '@/services/socketService';
import StripeBillingService from '@/services/stripeBillingService';
import { useToast } from '@/hooks/use-toast';
import type { ChatMessage, CallStatus, SessionType, OpponentInfo } from '@/types/session';

interface WebRTCContextType {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  callStatus: CallStatus;
  sessionType: SessionType;
  isMuted: boolean;
  isVideoOff: boolean;
  chatMessages: ChatMessage[];
  billingStatus: {
    startTime: number | null;
    currentBalance: number | null;
    ratePerMinute: number | null;
    remainingMinutes: number | null;
    totalBilled: number | null;
    totalMinutes: number | null;
  };
  opponentInfo: OpponentInfo | null;
  initializeCall: (sessionId: string, sessionType: SessionType, opponentInfo: OpponentInfo, isInitiator: boolean) => Promise<void>;
  toggleMute: () => void;
  toggleVideo: () => void;
  sendChatMessage: (text: string) => void;
  endCall: () => void;
}

const WebRTCContext = createContext<WebRTCContextType | undefined>(undefined);

export const WebRTCProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, updateUserBalance } = useAuth();
  const { toast } = useToast();
  
  // State
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  const [sessionType, setSessionType] = useState<SessionType>('video');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [billingStatus, setBillingStatus] = useState({
    startTime: null as number | null,
    currentBalance: null as number | null,
    ratePerMinute: null as number | null,
    remainingMinutes: null as number | null,
    totalBilled: null as number | null,
    totalMinutes: null as number | null,
  });
  const [opponentInfo, setOpponentInfo] = useState<OpponentInfo | null>(null);
  
  // Refs
  const webRTCServiceRef = useRef<WebRTCService | null>(null);
  const billingServiceRef = useRef<StripeBillingService | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  
  // Initialize socket connection when component mounts
  useEffect(() => {
    if (currentUser) {
      socketService.connect(currentUser.uid)
        .catch(error => {
          console.error('Failed to connect to signaling server:', error);
          toast({
            variant: 'destructive',
            title: 'Connection Error',
            description: 'Failed to connect to signaling server. Please try again.'
          });
        });
    }
    
    return () => {
      socketService.disconnect();
    };
  }, [currentUser, toast]);
  
  // Initialize WebRTC service
  const initializeWebRTCService = () => {
    if (!webRTCServiceRef.current) {
      if (!socketService.socket) {
        throw new Error('Socket connection not established');
      }
      if (!currentUser) {
        throw new Error('User not authenticated');
      }
      webRTCServiceRef.current = new WebRTCService(
        socketService.socket, 
        currentUser.uid, 
        currentUser.role as 'reader' | 'client'
      );
    }
    return webRTCServiceRef.current;
  };
  
  // Initialize billing service
  const initializeBillingService = (
    readerId: string, 
    clientId: string, 
    sessionId: string, 
    ratePerMinute: number, 
    clientBalance: number,
    readerAccountId: string
  ) => {
    if (!billingServiceRef.current) {
      billingServiceRef.current = new StripeBillingService();
    }
    
    billingServiceRef.current.initialize({
      readerId,
      clientId,
      sessionId,
      ratePerMinute,
      clientBalance,
      readerAccountId
    });
    
    // Set up billing update callback
    billingServiceRef.current.onBalanceUpdate((status) => {
      setBillingStatus({
        startTime: status.startTime,
        currentBalance: status.currentBalance,
        ratePerMinute: status.ratePerMinute,
        remainingMinutes: status.remainingMinutes,
        totalBilled: status.totalBilled || null,
        totalMinutes: status.totalMinutes || null,
      });
      
      // Update user balance in auth context
      if (currentUser?.role === 'client' && currentUser.uid === clientId) {
        updateUserBalance(clientId, status.currentBalance);
      }
    });
    
    // Set up session end callback
    billingServiceRef.current.onSessionEnd(({ reason }) => {
      if (reason === 'insufficient_funds' || reason === 'insufficient_funds_initial') {
        toast({
          variant: 'destructive',
          title: 'Session Ended',
          description: 'Your session has ended due to insufficient funds.'
        });
      }
      endCall();
    });
    
    return billingServiceRef.current;
  };
  
  // Initialize call
  const initializeCall = async (
    sessionId: string, 
    callSessionType: SessionType, 
    opponent: OpponentInfo, 
    isInitiator: boolean
  ) => {
    try {
      setCallStatus('loading_session');
      sessionIdRef.current = sessionId;
      setSessionType(callSessionType);
      setOpponentInfo(opponent);
      setChatMessages([]);
      
      // Initialize WebRTC service
      const webRTCService = initializeWebRTCService();
      
      // Set up chat handlers
      webRTCService.setupChatHandlers(setChatMessages, toast);
      
      // Set up connection state change handler
      webRTCService.onConnectionStateChange((state) => {
        if (state === 'connected' || state === 'completed') {
          setCallStatus('connected');
          
          // Start billing if this is the client
          if (currentUser?.role === 'client' && billingServiceRef.current && !billingServiceRef.current.sessionActive) {
            billingServiceRef.current.startBilling();
          }
        } else if (state === 'disconnected') {
          setCallStatus('disconnected');
          
          // Pause billing
          if (billingServiceRef.current) {
            billingServiceRef.current.pauseBilling();
          }
        } else if (state === 'failed') {
          setCallStatus('error');
          toast({
            variant: 'destructive',
            title: 'Connection Failed',
            description: 'The connection has failed. Please try again.'
          });
          
          // End billing
          if (billingServiceRef.current) {
            billingServiceRef.current.endBilling('connection_failed');
          }
        }
      });
      
      // Set up remote stream handler
      webRTCService.onRemoteStream((stream) => {
        setRemoteStream(stream);
      });
      
      // Initialize the WebRTC connection
      setCallStatus('permission_granted');
      
      if (!currentUser) {
        throw new Error('User not authenticated');
      }
      
      const stream = await webRTCService.initialize(
        sessionId, 
        currentUser.uid, 
        currentUser.role as 'reader' | 'client'
      );
      
      setLocalStream(stream);
      
      // Initialize billing if this is a client
      if (currentUser?.role === 'client' && opponent.uid) {
        // In a real app, you'd fetch the reader's Stripe account ID
        const readerAccountId = opponent.stripeAccountId || 'acct_reader123'; // Use actual account ID if available
        
        // Initialize billing service
        const billingService = initializeBillingService(
          opponent.uid,
          currentUser.uid,
          sessionId,
          opponent.ratePerMinute || 5, // Use actual rate if available
          currentUser.balance || 0,
          readerAccountId
        );
      }
      
      setCallStatus('connecting');
      
      // Notify the server that the session has started
      socketService.emit('session-started', {
        roomId: sessionId,
        sessionId,
        startTime: Date.now()
      });
      
    } catch (error) {
      console.error('Error initializing call:', error);
      setCallStatus('error');
      toast({
        variant: 'destructive',
        title: 'Call Initialization Failed',
        description: error instanceof Error ? error.message : 'Failed to initialize call'
      });
    }
  };
  
  // Toggle mute
  const toggleMute = () => {
    if (!webRTCServiceRef.current || !localStream) return;
    
    webRTCServiceRef.current.toggleAudio(!isMuted);
    setIsMuted(!isMuted);
  };
  
  // Toggle video
  const toggleVideo = () => {
    if (!webRTCServiceRef.current || !localStream || sessionType !== 'video') return;
    
    webRTCServiceRef.current.toggleVideo(!isVideoOff);
    setIsVideoOff(!isVideoOff);
  };
  
  // Send chat message
  const sendChatMessage = (text: string) => {
    if (!webRTCServiceRef.current || !currentUser || !opponentInfo) return;
    
    const message = {
      senderUid: currentUser.uid,
      senderName: currentUser.name || 'Anonymous',
      text,
      timestamp: new Date().toISOString()
    };
    
    webRTCServiceRef.current.sendChatMessage(message);
  };
  
  // End call
  const endCall = () => {
    // Stop billing
    if (billingServiceRef.current && billingServiceRef.current.sessionActive) {
      const billingResult = billingServiceRef.current.endBilling('user_ended');
      
      // Notify the server that the session has ended
      if (sessionIdRef.current && currentUser) {
        socketService.emit('session-ended', {
          roomId: sessionIdRef.current,
          sessionId: sessionIdRef.current,
          endedBy: currentUser.uid,
          endTime: billingResult.endTime,
          duration: billingResult.totalMinutes,
          totalAmount: billingResult.totalBilled
        });
      }
    }
    
    // Clean up WebRTC
    if (webRTCServiceRef.current) {
      webRTCServiceRef.current.disconnect();
    }
    
    // Reset state
    setLocalStream(null);
    setRemoteStream(null);
    setCallStatus('idle');
    setChatMessages([]);
    setBillingStatus({
      startTime: null,
      currentBalance: null,
      ratePerMinute: null,
      remainingMinutes: null,
      totalBilled: null,
      totalMinutes: null,
    });
    setOpponentInfo(null);
    sessionIdRef.current = null;
    webRTCServiceRef.current = null;
    billingServiceRef.current = null;
  };
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (webRTCServiceRef.current) {
        webRTCServiceRef.current.disconnect();
      }
      
      if (billingServiceRef.current && billingServiceRef.current.sessionActive) {
        billingServiceRef.current.endBilling('component_unmounted');
      }
      
      if (sessionIdRef.current) {
        socketService.emit('leave-room', sessionIdRef.current);
      }
    };
  }, []);
  
  const value = {
    localStream,
    remoteStream,
    callStatus,
    sessionType,
    isMuted,
    isVideoOff,
    chatMessages,
    billingStatus,
    opponentInfo,
    initializeCall,
    toggleMute,
    toggleVideo,
    sendChatMessage,
    endCall,
  };
  
  return (
    <WebRTCContext.Provider value={value}>
      {children}
    </WebRTCContext.Provider>
  );
};

export const useWebRTC = () => {
  const context = useContext(WebRTCContext);
  if (context === undefined) {
    throw new Error('useWebRTC must be used within a WebRTCProvider');
  }
  return context;
};