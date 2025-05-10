'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation'; // Changed from react-router-dom
import { useAuth } from '@/contexts/auth-context'; // Adjusted path
import WebRTCService from '@/services/webRTCService'; // Adjusted path
import SocketService from '@/services/socketService'; // Adjusted path (assuming it's the existing one)
import StripeBillingService from '@/services/stripeBillingService'; // Adjusted path
import ChatService from '@/services/chatService'; // Adjusted path
import VideoControls from '@/components/session/VideoControls'; // Adjusted path
import VideoDisplay from '@/components/session/VideoDisplay'; // Adjusted path
import { ChatInterface } from '@/components/session/ChatInterface'; // Using existing ChatInterface
import SessionInfo from '@/components/session/SessionInfo'; // Adjusted path
import PreCallChecks from '@/components/session/PreCallChecks'; // Adjusted path
import { Button } from '@/components/ui/button'; // Adjusted path
import { useToast } from '@/hooks/use-toast'; // Adjusted path
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'; // Adjusted path
import { AlertCircle, Loader2 } from 'lucide-react';
import type { AppUser } from '@/types/user';
import type { VideoSessionData, ChatMessage as SessionChatMessage } from '@/types/session'; // Renamed ChatMessage to avoid conflict


const VideoCallPage = () => {
  const params = useParams();
  const sessionId = params.sessionId as string;
  const router = useRouter(); // Changed from useNavigate
  const { currentUser } = useAuth(); // Changed from user to currentUser
  const { toast } = useToast();

  const [status, setStatus] = useState<'initializing' | 'device_error' | 'checking' | 'connecting' | 'connected' | 'reconnecting' | 'ended' | 'error'>('initializing');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [sessionData, setSessionData] = useState<VideoSessionData & { reader?: AppUser, client?: AppUser, clientBalance?: number, roomId?: string } | null>(null); // roomId added for compatibility with new code
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [messages, setMessages] = useState<SessionChatMessage[]>([]); // Use SessionChatMessage
  const [billingStatus, setBillingStatus] = useState<any>(null); // Define a proper type later
  const [deviceStatus, setDeviceStatus] = useState<{ hasCamera: boolean; hasMicrophone: boolean; cameraError?: string; microphoneError?: string; } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showLowBalanceWarning, setShowLowBalanceWarning] = useState(false);
  const [showConnectionIssueDialog, setShowConnectionIssueDialog] = useState(false);
  const [connectionState, setConnectionState] = useState<RTCIceConnectionState | 'new' | 'checking' | 'connecting' | 'connected' | 'disconnected' | 'failed' | 'closed'>('new');


  // Refs for services - Note: SocketService is a singleton instance, others might be new instances per session
  const webRTCServiceRef = useRef<WebRTCService | null>(null);
  const billingServiceRef = useRef<StripeBillingService | null>(null);
  const chatServiceRef = useRef<ChatService | null>(null);

  const endCall = useCallback((reason = 'user_ended') => {
    setStatus(prevStatus => {
      if (prevStatus === 'ended') return prevStatus; // Avoid multiple end call operations

      if (SocketService.socket && sessionData?.roomId) {
        SocketService.emit('session-status', { // Adapted to existing SocketService method
          roomId: sessionData.roomId,
          status: {
            type: 'ended',
            userId: currentUser?.uid,
            userName: currentUser?.name,
            reason: reason,
            timestamp: new Date().toISOString()
          }
        });
      }

      if (billingServiceRef.current && billingServiceRef.current.sessionActive) {
        const endData = billingServiceRef.current.endBilling(reason);
        setBillingStatus((prev: any) => ({
          ...prev,
          endTime: endData.endTime,
          totalBilled: endData.totalBilled,
          totalMinutes: endData.totalMinutes,
          reason: endData.reason
        }));
      }

      webRTCServiceRef.current?.disconnect();
      
      // Don't navigate immediately, let UI show "Session Ended"
      // setTimeout(() => {
      //   router.push(`/dashboard`); // Redirect to dashboard or summary
      // }, 2000);
      return 'ended';
    });
  }, [currentUser, sessionData, router]);


  // Initialize services
  useEffect(() => {
    if (!sessionId || !currentUser) return;

    const initializeServices = async () => {
      try {
        // Fetch session data (using API route as per new code)
        const response = await fetch(`/api/sessions/${sessionId}`); // API route needs to be implemented
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch session data');
        }
        const data = await response.json();
        setSessionData({ ...data, roomId: data.id }); // Assuming session ID is the room ID

        // Initialize socket service (using existing singleton)
        if (!SocketService.socket || !SocketService.socket.connected) {
          await SocketService.connect(currentUser.uid);
        }
        if (!SocketService.socket) throw new Error("Socket connection failed.");


        webRTCServiceRef.current = new WebRTCService(SocketService.socket);
        chatServiceRef.current = new ChatService(SocketService.socket);
        chatServiceRef.current.initialize(
          data.id, // Use session ID as room ID
          currentUser.uid,
          currentUser.name || 'User'
        );

        chatServiceRef.current.onMessage((message) => {
          // Adapt incoming message to SessionChatMessage format if needed
          setMessages((prevMessages) => [...prevMessages, {
            id: message.id,
            senderUid: message.senderId,
            senderName: message.senderName,
            text: message.text,
            timestamp: message.timestamp,
            isOwn: message.senderId === currentUser.uid,
          }]);
        });

        const deviceCheck = await webRTCServiceRef.current.checkMediaDevices();
        setDeviceStatus(deviceCheck);

        if (!deviceCheck.hasCamera || !deviceCheck.hasMicrophone) {
          let errorMsg = "";
          if(!deviceCheck.hasCamera && !deviceCheck.hasMicrophone) errorMsg = "Camera and microphone not available.";
          else if (!deviceCheck.hasCamera) errorMsg = deviceCheck.cameraError || "Camera not available.";
          else if (!deviceCheck.hasMicrophone) errorMsg = deviceCheck.microphoneError || "Microphone not available.";
          
          setStatus('device_error');
          setError(errorMsg);
          toast({variant: 'destructive', title: "Device Error", description: errorMsg});
          return;
        }
        setStatus('checking');
      } catch (err: any) {
        console.error('Error initializing services:', err);
        setStatus('error');
        setError(err.message || "Initialization failed.");
        toast({variant: 'destructive', title: "Initialization Error", description: err.message || "Could not initialize session services."});
      }
    };

    initializeServices();

    return () => {
      webRTCServiceRef.current?.disconnect();
      // SocketService is a singleton, usually not disconnected per component unless app-wide
      // chatServiceRef.current?.disconnect(); // if chat service needs cleanup
      if (billingServiceRef.current && billingServiceRef.current.sessionActive) {
        billingServiceRef.current.endBilling('component_unmounted');
      }
    };
  }, [sessionId, currentUser, toast]);


  const startCall = useCallback(async () => {
    if (!sessionData || !webRTCServiceRef.current || !SocketService.socket || !currentUser) return;
    
    try {
      setStatus('connecting');
      const isInitiator = currentUser.role === 'reader'; // Reader initiates/offers
      const stream = await webRTCServiceRef.current.initialize(
        sessionData.roomId!, // Assert roomId exists
        isInitiator
      );
      setLocalStream(stream);

      webRTCServiceRef.current.onRemoteStream((remoteS) => {
        setRemoteStream(remoteS);
        setStatus('connected');

        if (currentUser.role === 'client') {
          startBilling();
        }
        
        SocketService.socket?.emit('session-status', { // Use existing emit method
           roomId: sessionData.roomId,
           status: {
                type: 'connected',
                userId: currentUser.uid,
                userName: currentUser.name,
                timestamp: new Date().toISOString()
           }
        });
        toast({ title: 'Connected', description: `You are now connected.` });
      });

      webRTCServiceRef.current.onConnectionStateChange((state) => {
        console.log('Connection state changed:', state);
        setConnectionState(state);

        if (state === 'disconnected' || state === 'failed' || state === 'closed') {
          setShowConnectionIssueDialog(true);
          if (billingServiceRef.current?.sessionActive) {
            billingServiceRef.current.pauseBilling();
          }
          setStatus('reconnecting');
          toast({ title: 'Connection Lost', description: 'Attempting to reconnect...', variant: 'destructive' });
        } else if (state === 'connected' && status === 'reconnecting') {
          setShowConnectionIssueDialog(false);
          setStatus('connected');
          if (billingServiceRef.current && billingServiceRef.current.isPaused) { // Check if it was paused
            billingServiceRef.current.resumeBilling();
          }
          toast({ title: 'Reconnected', description: 'Your connection has been restored.' });
        }
      });

      SocketService.socket.on('session-status', (data: {status: {type: string, reason?: string}}) => { // Listen to existing event
        if (data.status.type === 'ended') {
          console.log('Remote user ended session:', data.status);
          endCall(data.status.reason || 'remote_ended');
        }
      });

    } catch (err: any) {
      console.error('Error starting call:', err);
      setStatus('error');
      setError(err.message || "Failed to start the call.");
      toast({variant: 'destructive', title: "Call Error", description: err.message || "Could not start the call."});
    }
  }, [sessionData, currentUser, status, endCall, toast]);


  const startBilling = useCallback(() => {
    if (currentUser?.role !== 'client' || !sessionData || !sessionData.reader || !sessionData.reader.ratePerMinute || typeof sessionData.clientBalance !== 'number') {
      console.warn("Billing cannot start: missing data or incorrect role.", {currentUser, sessionData});
      return;
    }

    billingServiceRef.current = new StripeBillingService();
    billingServiceRef.current.initialize({
      readerId: sessionData.readerUid, // Assuming readerUid is available
      clientId: currentUser.uid,
      sessionId: sessionId,
      ratePerMinute: sessionData.reader.ratePerMinute,
      clientBalance: sessionData.clientBalance 
    });

    billingServiceRef.current.onBalanceUpdate((data: any) => {
      setBillingStatus(data);
      if (SocketService.socket && sessionData.roomId) {
         SocketService.emit('billing-update',{ roomId: sessionData.roomId, billingData: data }); // Use existing emit
      }
      if (data.remainingMinutes <= 2 && !showLowBalanceWarning) {
        setShowLowBalanceWarning(true);
        toast({ title: 'Low Balance Warning', description: `You have ~${Math.floor(data.remainingMinutes)} min remaining.`, variant: 'destructive', duration: 10000 });
      }
    });

    billingServiceRef.current.onSessionEnd((data: { reason: string }) => {
      endCall(data.reason);
    });

    const billingStartData = billingServiceRef.current.startBilling();
    setBillingStatus({
      startTime: billingStartData.startTime,
      currentBalance: sessionData.clientBalance,
      ratePerMinute: sessionData.reader.ratePerMinute,
      remainingMinutes: Math.floor(sessionData.clientBalance / sessionData.reader.ratePerMinute)
    });

    // Update session status in DB via API
    fetch(`/api/sessions/${sessionId}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ startTime: billingStartData.startTime })
    }).catch(err => console.error('Error updating session start status:', err));

  }, [currentUser, sessionData, sessionId, showLowBalanceWarning, endCall, toast]);


  useEffect(() => {
    if (currentUser?.role === 'reader' && SocketService.socket && sessionData?.roomId) {
      SocketService.socket.on('billing-update', (data: {billingData: any}) => { // Listen to existing event
        setBillingStatus(data.billingData);
      });
      return () => { SocketService.socket?.off('billing-update'); }
    }
  }, [currentUser, sessionData]);


  const toggleAudio = () => {
    if (webRTCServiceRef.current) {
      webRTCServiceRef.current.toggleAudio(!isAudioEnabled);
      setIsAudioEnabled(!isAudioEnabled);
    }
  };

  const toggleVideo = () => {
    if (webRTCServiceRef.current) {
      webRTCServiceRef.current.toggleVideo(!isVideoEnabled);
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  const sendMessageViaChatService = (text: string) => {
    if (chatServiceRef.current) {
      const message = chatServiceRef.current.sendMessage(text);
      if (message && currentUser) { // Add local echo
         setMessages((prevMessages) => [...prevMessages, {
            id: message.id,
            senderUid: currentUser.uid,
            senderName: currentUser.name || "You",
            text: message.text,
            timestamp: message.timestamp,
            isOwn: true,
          }]);
      }
    }
  };
  
  const handleOpenSettings = (type: 'audio' | 'video') => {
     toast({ title: `${type.charAt(0).toUpperCase() + type.slice(1)} Settings`, description: "Device settings management coming soon!"});
  };


  if (status === 'initializing' || (status === 'checking' && !deviceStatus)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
        <Card className="w-full max-w-md p-6 bg-[hsl(var(--card))] border-[hsl(var(--border)/0.7)] shadow-xl">
          <CardHeader>
            <CardTitle className="text-3xl font-alex-brush text-[hsl(var(--soulseer-header-pink))] text-center">Preparing Your Session</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary my-8" />
            <p className="text-center text-muted-foreground font-playfair-display">
              {status === 'initializing' ? 'Initializing connection...' : 'Checking your devices...'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'device_error' || status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
         <Card className="w-full max-w-md p-6 bg-[hsl(var(--card))] border-[hsl(var(--border)/0.7)] shadow-xl">
          <CardHeader>
             <CardTitle className="text-3xl font-alex-brush text-destructive text-center">Connection Error</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground font-playfair-display mb-6">{error || 'Failed to establish connection.'}</p>
            <Button onClick={() => router.push('/dashboard')} className="font-playfair-display">
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'checking' && deviceStatus) {
    return <PreCallChecks deviceStatus={deviceStatus} onContinue={startCall} onCancel={() => router.push('/dashboard')} />;
  }

  if (status === 'connecting' || status === 'reconnecting') {
     return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
        <Card className="w-full max-w-md p-6 bg-[hsl(var(--card))] border-[hsl(var(--border)/0.7)] shadow-xl">
          <CardHeader>
             <CardTitle className={`text-3xl font-alex-brush text-center ${status === 'reconnecting' ? 'text-amber-500' : 'text-[hsl(var(--soulseer-header-pink))]'}`}>
                {status === 'reconnecting' ? 'Reconnecting' : 'Connecting'}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <Loader2 className={`h-12 w-12 animate-spin my-8 ${status === 'reconnecting' ? 'text-amber-500' : 'text-primary'}`} />
            <p className="text-center text-muted-foreground font-playfair-display">
              {status === 'reconnecting' ? 'Connection lost. Attempting to reconnect...' : 'Establishing secure connection...'}
            </p>
             {status === 'reconnecting' && (
                <Button variant="destructive" onClick={() => endCall('connection_failed')} className="mt-6 font-playfair-display">
                    End Session
                </Button>
             )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'ended') {
    return (
       <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
        <Card className="w-full max-w-md p-6 bg-[hsl(var(--card))] border-[hsl(var(--border)/0.7)] shadow-xl">
          <CardHeader>
            <CardTitle className="text-3xl font-alex-brush text-[hsl(var(--soulseer-header-pink))] text-center">Session Ended</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground font-playfair-display mb-6">
              Your session has ended. {billingStatus?.reason && `Reason: ${billingStatus.reason.replace(/_/g, ' ')}.`}
            </p>
            {billingStatus && (
                <div className="font-playfair-display text-sm text-muted-foreground mb-4">
                    <p>Total Time: {billingStatus.totalMinutes || 0} minutes</p>
                    <p>Total Billed: ${ (billingStatus.totalBilled || 0).toFixed(2)}</p>
                </div>
            )}
            <Button onClick={() => router.push('/dashboard')} className="mt-4 font-playfair-display">
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Main connected view
  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      {sessionData && currentUser && (
        <SessionInfo 
          sessionData={sessionData}
          billingStatus={billingStatus}
          userRole={currentUser.role}
          // elapsedTime prop can be managed here or inside SessionInfo if more complex logic needed
        />
      )}
      
      <div className="flex flex-1 overflow-hidden p-2 sm:p-4 gap-2 sm:gap-4">
        <div className="flex-1 flex flex-col min-w-0"> {/* Video area */}
          <VideoDisplay 
            localStream={localStream}
            remoteStream={remoteStream}
            isLocalVideoEnabled={isVideoEnabled}
            isConnecting={status === 'connecting'}
            connectionState={connectionState}
          />
           <VideoControls 
            isAudioEnabled={isAudioEnabled}
            isVideoEnabled={isVideoEnabled}
            onToggleAudio={toggleAudio}
            onToggleVideo={toggleVideo}
            onEndCall={() => endCall('user_ended')}
            onOpenSettings={handleOpenSettings}
          />
        </div>

        {sessionData && currentUser && ( /* Chat area */
          <div className="w-full md:w-80 lg:w-96 border-l border-[hsl(var(--border)/0.3)] flex flex-col bg-[hsl(var(--card)/0.5)] rounded-lg shadow-md">
            <ChatInterface 
              messages={messages}
              dataChannel={null} // ChatService now handles sending, this might need refactor in ChatInterface or ChatService provides events
              currentUser={currentUser}
              setChatMessages={setMessages} // Allow ChatInterface to update messages for local echo if ChatService doesn't
              isMediaSession={true} // Assuming it's always a media session here
              callStatus={status as any} // Cast status, or refine CallStatus type
              // sendMessage prop for ChatInterface to use ChatService
              sendMessageOverride={sendMessageViaChatService}
            />
          </div>
        )}
      </div>

      <Dialog open={showConnectionIssueDialog} onOpenChange={setShowConnectionIssueDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-alex-brush text-[hsl(var(--soulseer-header-pink))] flex items-center">
              <AlertCircle className="h-5 w-5 text-amber-500 mr-2" />
              Connection Issues
            </DialogTitle>
          </DialogHeader>
          <DialogDescription className="font-playfair-display text-foreground/80">
            We're experiencing connection issues. Billing has been paused while we try to reconnect.
          </DialogDescription>
          <DialogFooter>
            <Button variant="destructive" onClick={() => endCall('connection_failed')} className="font-playfair-display">
              End Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showLowBalanceWarning} onOpenChange={setShowLowBalanceWarning}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-alex-brush text-[hsl(var(--soulseer-header-pink))] flex items-center">
              <AlertCircle className="h-5 w-5 text-amber-500 mr-2" />
              Low Balance Warning
            </DialogTitle>
          </DialogHeader>
          <DialogDescription className="font-playfair-display text-foreground/80">
            {billingStatus && (
              <p>
                You have approximately {Math.floor(billingStatus.remainingMinutes || 0)} minute{billingStatus.remainingMinutes === 1 ? '' : 's'} remaining.
                The session will end automatically when your balance is insufficient.
              </p>
            )}
          </DialogDescription>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowLowBalanceWarning(false)} className="font-playfair-display">
              Continue Session
            </Button>
            <Button onClick={() => router.push('/dashboard')} className="font-playfair-display bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"> {/* Changed to dashboard, add-funds page not created */}
              Go to Dashboard 
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VideoCallPage;
