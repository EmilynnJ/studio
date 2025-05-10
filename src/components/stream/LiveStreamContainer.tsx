
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/components/ui/use-toast';
import type { AppUser } from '@/types/user';

// Services (assuming these will be created with appropriate types)
import LiveStreamService from '@/services/liveStreamService';
import socketService from '@/services/socketService';

// Components
import StreamerView from './StreamerView';
import ViewerView from './ViewerView';
import LiveChat, { type ChatMessage as StreamChatMessage } from './LiveChat'; // Assuming LiveChat component and its types
import GiftPanel from './GiftPanel'; // Assuming GiftPanel component

interface StreamData {
  id: string;
  streamerId: string;
  streamerName: string;
  title: string;
  isActive: boolean;
  // Add other stream properties as needed
  streamer?: { name: string; /* other streamer details */ }; // Example: for ViewerView
}

interface Gift {
  id: string;
  senderName: string;
  type: string;
  amount: number; // in cents
  timestamp: string;
}

interface Viewer {
  userId: string;
  userName: string;
}

interface LiveStreamContainerProps {
  viewerMode?: boolean;
}

const LiveStreamContainer: React.FC<LiveStreamContainerProps> = ({ viewerMode = true }) => {
  const params = useParams();
  const router = useRouter();
  const { currentUser } = useAuth();
  const { toast } = useToast();

  const streamerIdParam = params.streamerId as string | undefined;

  // Refs
  const liveStreamServiceRef = useRef<LiveStreamService | null>(null);

  // State
  const [streamData, setStreamData] = useState<StreamData | null>(null);
  const [streamStatus, setStreamStatus] = useState<'loading' | 'starting' | 'active' | 'ended'>('loading');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [viewers, setViewers] = useState<Viewer[]>([]);
  const [viewerCount, setViewerCount] = useState(0);
  const [messages, setMessages] = useState<StreamChatMessage[]>([]);
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [earnings, setEarnings] = useState(0); // in cents
  const [error, setError] = useState<string | null>(null);

  // Get stream ID
  const streamId = viewerMode ? streamerIdParam : currentUser?.uid;

  // Fetch stream data
  useEffect(() => {
    if (!streamId && viewerMode) { // If viewer mode and no streamerIdParam, something is wrong
        setError('Stream ID is missing.');
        setStreamStatus('ended');
        return;
    }
    if(!currentUser && !viewerMode){ // If streamer mode and no current user
        setError('You must be logged in to start a stream.');
        setStreamStatus('ended');
        router.push('/login');
        return;
    }


    const fetchStreamData = async () => {
      setStreamStatus('loading');
      try {
        // Placeholder: API calls to fetch stream data
        // In a real app, this would be an actual API call
        // For now, simulate data or use a mock service
        if (viewerMode && streamId) {
           console.log(`Fetching stream data for viewer: ${streamId}`);
           // Simulate fetching existing stream data
           // const response = await fetch(`/api/streams/${streamId}`);
           // if (!response.ok) throw new Error('Failed to fetch stream data');
           // const data = await response.json();
           const mockViewerStreamData: StreamData = { id: streamId, streamerId: streamId, streamerName: 'Mock Streamer', title: 'Live Session!', isActive: true, streamer: { name: 'Mock Streamer'} };
           setStreamData(mockViewerStreamData);
           if (!mockViewerStreamData.isActive) {
             setError('This stream is currently offline.');
             setStreamStatus('ended');
             return;
           }
           setStreamStatus('active'); // Assume active for viewer if fetched
        } else if (!viewerMode && currentUser) {
            console.log(`Fetching/creating stream data for streamer: ${currentUser.uid}`);
            // Simulate creating/fetching streamer's own stream data
            // const response = await fetch('/api/streams/me', { headers: { Authorization: `Bearer ${currentUser.token}` }});
            // if (!response.ok) throw new Error('Failed to fetch/create stream data');
            // const data = await response.json();
            const mockStreamerData: StreamData = { id: currentUser.uid, streamerId: currentUser.uid, streamerName: currentUser.name || 'Streamer', title: `${currentUser.name}'s Stream`, isActive: false }; // isActive false initially for streamer
            setStreamData(mockStreamerData);
            setStreamStatus('starting'); // Streamer starts in 'starting' state
        } else {
            throw new Error("Invalid state for fetching stream data.");
        }

      } catch (err) {
        const e = err as Error;
        console.error('Error fetching stream data:', e);
        setError(e.message || 'Failed to load stream data. Please try again.');
        setStreamStatus('ended');
      }
    };

    fetchStreamData();
  }, [streamerIdParam, viewerMode, currentUser, router]);

  // Initialize services when stream data is available
  useEffect(() => {
    if (!streamData || !streamId || !currentUser) return; // currentUser needed for socket connection identity
    if(streamStatus === 'loading' || streamStatus === 'ended') return;


    const initializeServices = async () => {
      try {
        await socketService.connect(currentUser.uid); // Pass user ID for socket identification

        liveStreamServiceRef.current = new LiveStreamService();
        liveStreamServiceRef.current.initialize(
          socketService.socket!, // Assert socket is not null after connect()
          streamId,
          !viewerMode, // isStreamer
          handleViewerJoin,
          handleViewerLeave,
          handleGiftReceived,
          handleRemoteStreamEvent // Pass the handler for custom event
        );

        if (!viewerMode) { // Streamer mode
          if(streamStatus === 'starting'){
            const stream = await liveStreamServiceRef.current.getUserMedia();
            setLocalStream(stream);
            await liveStreamServiceRef.current.startStreaming(stream); // Pass localStream
            setStreamStatus('active');
            // Notify backend that stream is now active
            // await fetch(`/api/streams/${streamId}/activate`, { method: 'POST' });
          }
        } else { // Viewer mode
          // liveStreamServiceRef.current.joinStream(); // Viewer joins stream
        }
      } catch (err) {
        const e = err as Error;
        console.error('Error initializing services:', e);
        setError(e.message || 'Failed to initialize stream. Please try again.');
        setStreamStatus('ended');
      }
    };

    initializeServices();

    return () => {
      cleanupServices();
    };
  }, [streamData, streamId, viewerMode, currentUser, streamStatus]); // Added streamStatus to re-init if it changes from loading

  const handleRemoteStreamEvent = (event: CustomEvent<MediaStream>) => {
    setRemoteStream(event.detail);
  };
  
  const handleViewerJoin = (viewer: Viewer) => {
    setViewers(prev => [...prev, viewer]);
    setViewerCount(prev => prev + 1);
    addSystemMessage(`${viewer.userName} joined the stream`);
  };

  const handleViewerLeave = (viewer: Viewer) => {
    setViewers(prev => prev.filter(v => v.userId !== viewer.userId));
    setViewerCount(prev => Math.max(0, prev - 1));
    addSystemMessage(`${viewer.userName} left the stream`);
  };

  const handleGiftReceived = (gift: Gift) => {
    setGifts(prev => [gift, ...prev].slice(0, 10)); // Keep last 10 gifts
    setEarnings(prev => prev + gift.amount);
    addSystemMessage(`${gift.senderName} sent a ${gift.type} (${formatCurrency(gift.amount)})!`);
    toast({
      title: 'Gift Received!',
      description: `${gift.senderName} sent a ${gift.type} (${formatCurrency(gift.amount)})`,
    });
  };

  const addSystemMessage = (text: string) => {
    const message: StreamChatMessage = {
      id: Date.now().toString(),
      userId: 'system',
      userName: 'System',
      text,
      timestamp: new Date().toISOString(),
      isSystem: true,
    };
    setMessages(prev => [...prev, message]);
  };

  const sendMessage = (text: string) => {
    if (!socketService.socket || !currentUser || !streamId) return;

    const message: StreamChatMessage = {
      id: Date.now().toString(),
      userId: currentUser.uid,
      userName: currentUser.name || 'Anonymous',
      text,
      timestamp: new Date().toISOString(),
    };

    socketService.emit('stream-message', { streamId, message });
    setMessages(prev => [...prev, message]); // Local echo
  };

  const sendGift = async (giftData: { type: string; amount: number }) => {
    if (!liveStreamServiceRef.current || !currentUser || !streamId) return;

    const fullGiftData = {
        ...giftData,
        streamerId: streamData?.streamerId || streamId, // Target streamer
        senderId: currentUser.uid,
        senderName: currentUser.name || 'Anonymous'
    };

    try {
      await liveStreamServiceRef.current.sendGift(fullGiftData);
      toast({
        title: 'Gift Sent!',
        description: `You sent a ${giftData.type} (${formatCurrency(giftData.amount)})`,
      });
    } catch (err) {
      const e = err as Error;
      console.error('Error sending gift:', e);
      toast({
        variant: 'destructive',
        title: 'Gift Failed',
        description: e.message || 'Failed to send gift. Please try again.',
      });
    }
  };

  const toggleAudio = () => {
    if (!liveStreamServiceRef.current || !localStream) return;
    const enabled = liveStreamServiceRef.current.toggleAudio(localStream);
    setIsAudioEnabled(enabled);
  };

  const toggleVideo = () => {
    if (!liveStreamServiceRef.current || !localStream) return;
    const enabled = liveStreamServiceRef.current.toggleVideo(localStream);
    setIsVideoEnabled(enabled);
  };

  const endStream = async () => {
    try {
      if (liveStreamServiceRef.current) {
        liveStreamServiceRef.current.endStreaming();
      }
      setStreamStatus('ended');
      // Notify backend that stream has ended
      // await fetch(`/api/streams/${streamId}/deactivate`, { method: 'POST' });
      router.push('/dashboard');
    } catch (err) {
      const e = err as Error;
      console.error('Error ending stream:', e);
    }
  };

  const cleanupServices = () => {
    if (liveStreamServiceRef.current) {
      liveStreamServiceRef.current.cleanup();
      liveStreamServiceRef.current = null;
    }
    localStream?.getTracks().forEach(track => track.stop());
    setLocalStream(null);
    remoteStream?.getTracks().forEach(track => track.stop());
    setRemoteStream(null);
    socketService.disconnect();
  };

  const formatCurrency = (amountInCents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amountInCents / 100);
  };

  if (streamStatus === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="ml-4 text-lg text-foreground font-playfair-display">Loading Stream...</p>
      </div>
    );
  }

  if (streamStatus === 'ended' && error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background text-center">
        <h2 className="text-3xl font-alex-brush text-[hsl(var(--soulseer-header-pink))] mb-4">Stream Error</h2>
        <p className="text-destructive mb-6 font-playfair-display text-lg">{error}</p>
        <button
          className="px-6 py-3 bg-primary text-primary-foreground rounded-md font-playfair-display hover:bg-primary/90"
          onClick={() => router.push('/dashboard')}
        >
          Return to Dashboard
        </button>
      </div>
    );
  }
  
  if (streamStatus === 'ended' && viewerMode) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background text-center">
        <h2 className="text-3xl font-alex-brush text-[hsl(var(--soulseer-header-pink))] mb-4">Stream Ended</h2>
        <p className="text-foreground/80 mb-6 font-playfair-display text-lg">This live stream has ended.</p>
        <button
          className="px-6 py-3 bg-primary text-primary-foreground rounded-md font-playfair-display hover:bg-primary/90"
          onClick={() => router.push('/')}
        >
          Back to Home
        </button>
      </div>
    );
  }


  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 p-2 md:p-4">
          {viewerMode ? (
            <ViewerView
              streamer={streamData?.streamer || { name: streamData?.streamerName || 'Streamer' }}
              remoteStream={remoteStream}
              viewerCount={viewerCount}
            />
          ) : (
            currentUser && streamStatus === 'active' && ( // Only render StreamerView if currentUser exists and stream is active
              <StreamerView
                localStream={localStream}
                isAudioEnabled={isAudioEnabled}
                isVideoEnabled={isVideoEnabled}
                toggleAudio={toggleAudio}
                toggleVideo={toggleVideo}
                endStream={endStream}
                viewerCount={viewerCount}
                earnings={earnings}
              />
            )
          )}
          {streamStatus === 'starting' && !viewerMode && (
             <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                <p className="ml-4 text-lg text-foreground font-playfair-display">Preparing your stream...</p>
            </div>
          )}
        </div>

        <div className="w-full md:w-80 lg:w-96 border-l border-border/30 flex flex-col bg-card/50">
          <LiveChat
            messages={messages}
            sendMessage={sendMessage}
            currentUser={currentUser} // Pass AppUser
          />
          {viewerMode && currentUser && streamData && (
            <GiftPanel
              sendGift={sendGift}
              streamerName={streamData?.streamerName || 'Streamer'}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveStreamContainer;
