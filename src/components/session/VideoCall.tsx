import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Socket } from 'socket.io-client';
import WebRTCService from '@/services/webRTCService';
import StripeBillingService from '@/services/stripeBillingService';
import type { ChatMessage } from '@/types/session';
import { useToast } from '@/hooks/use-toast';

interface VideoCallProps {
  socket: Socket;
  readerAccountId: string;
}

// Video display component
const VideoDisplay: React.FC<{ localStream: MediaStream | null; remoteStream: MediaStream | null }> = ({ localStream, remoteStream }) => (
  <div className="video-container w-full h-auto relative">
    <div className="flex flex-col sm:flex-row w-full">
      <video
        className="local-video w-full sm:w-1/2"
        autoPlay
        muted
        ref={video => { if (video && localStream) video.srcObject = localStream; }}
      />
      <video
        className="remote-video w-full sm:w-1/2"
        autoPlay
        ref={video => { if (video && remoteStream) video.srcObject = remoteStream; }}
      />
    </div>
  </div>
);

// Video controls component
const VideoControls: React.FC<{ onToggleAudio: (enable: boolean) => void; onToggleVideo: (enable: boolean) => void; onEndCall: () => void }> = ({ onToggleAudio, onToggleVideo, onEndCall }) => {
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);

  return (
    <div className="controls absolute bottom-0 left-0 right-0 flex justify-evenly py-4 bg-black bg-opacity-50">
      <button 
        className="p-3 text-base"
        onClick={() => { setAudioEnabled(!audioEnabled); onToggleAudio(!audioEnabled); }}>
        {audioEnabled ? 'Mute' : 'Unmute'}
      </button>
      <button 
        className="p-3 text-base"
        onClick={() => { setVideoEnabled(!videoEnabled); onToggleVideo(!videoEnabled); }}>
        {videoEnabled ? 'Stop Video' : 'Start Video'}
      </button>
      <button 
        className="end-call text-red-600 p-3 text-base" 
        onClick={onEndCall}>End Call</button>
    </div>
  );
};

// Chat interface component
const ChatInterface: React.FC<{ messages: ChatMessage[]; onSend: (msg: Omit<ChatMessage, 'id' | 'isOwn'>) => void }> = ({ messages, onSend }) => {
  const [input, setInput] = useState('');
  const handleSend = () => {
    if (!input.trim()) return;
    onSend({ senderUid: '', senderName: '', text: input, timestamp: Date.now() });
    setInput('');
  };

  return (
    <div className="chat flex flex-col">
      <div className="messages overflow-auto flex-1">
        {messages.map(m => (
          <div key={m.id} className={m.isOwn ? 'own-message' : 'peer-message'}>
            <strong>{m.senderName}:</strong> {m.text}
          </div>
        ))}
      </div>
      <div className="chat-input flex mt-2">
        <input
          className="flex-1 border p-2"
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
        />
        <button className="ml-2" onClick={handleSend}>Send</button>
      </div>
    </div>
  );
};

// Main VideoCall component
const VideoCall: React.FC<VideoCallProps> = ({ socket, readerAccountId }) => {
  const toast = useToast();
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const webRTCServiceRef = useRef<WebRTCService | null>(null);
  const billingServiceRef = useRef<StripeBillingService | null>(null);

  useEffect(() => {
    const roomId = uuidv4();
    const webrtc = new WebRTCService(socket);
    const billing = new StripeBillingService();

    webRTCServiceRef.current = webrtc;
    billingServiceRef.current = billing;

    // Initialize billing with reader's Stripe Connect account
    billing.initialize({
      readerId: readerAccountId,
      clientId: '',
      sessionId: roomId,
      ratePerMinute: 1,
      clientBalance: 100,
      readerAccountId,
    });

    billing.onBalanceUpdate(status => {
      toast({ title: 'Billing Update', description: `Remaining minutes: ${status.remainingMinutes}`, });
    });

    billing.onSessionEnd(data => {
      toast({ variant: 'destructive', title: 'Session Ended', description: `Reason: ${data.reason}` });
      webrtc.disconnect();
    });

    // Listen for pause/resume from WebRTCService signaling
    socket.on('pause-billing', () => billing.pauseBilling());
    socket.on('resume-billing', () => billing.resumeBilling());

    // Setup chat handlers
    webrtc.setupChatHandlers(setMessages, toast);

    // Initialize WebRTC
    webrtc.onRemoteStream(stream => setRemoteStream(stream));
    webrtc.onConnectionStateChange(state => {
      if (state === 'connected') billing.startBilling();
    });
    webrtc.initialize(roomId, true)
      .then(stream => setLocalStream(stream))
      .catch(err => toast({ variant: 'destructive', title: 'WebRTC Error', description: err.message }));

    return () => {
      socket.off('pause-billing');
      socket.off('resume-billing');
      webrtc.disconnect();
      billing.endBilling('user_left');
    };
  }, [socket, readerAccountId, toast]);

  const handleSendMessage = (msg: Omit<ChatMessage, 'id' | 'isOwn'>) => {
    const success = webRTCServiceRef.current?.sendChatMessage(msg);
    if (!success) toast({ variant: 'destructive', title: 'Send Failed', description: 'Could not send chat message.' });
  };

  const handleToggleAudio = (enable: boolean) => webRTCServiceRef.current?.toggleAudio(enable);
  const handleToggleVideo = (enable: boolean) => webRTCServiceRef.current?.toggleVideo(enable);
  const handleEndCall = () => {
    webRTCServiceRef.current?.disconnect();
    billingServiceRef.current?.endBilling('ended_by_user');
  };

  return (
    <div className="video-call flex flex-col h-full">
      <div className="relative">
        <VideoDisplay localStream={localStream} remoteStream={remoteStream} />
        <VideoControls onToggleAudio={handleToggleAudio} onToggleVideo={handleToggleVideo} onEndCall={handleEndCall} />
      </div>
      <ChatInterface messages={messages} onSend={handleSendMessage} />
    </div>
  );
};

export default VideoCall;
