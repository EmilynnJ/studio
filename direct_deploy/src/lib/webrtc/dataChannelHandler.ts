import type { ChatMessage } from '@/types/session'; 
import { v4 as uuidv4 } from 'uuid';
import type { ToastSignature } from '@/hooks/use-toast';

export const setupDataChannelEventsHandler = (
  dc: RTCDataChannel,
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>,
  toast: ToastSignature
): RTCDataChannel => {
  dc.onopen = () => {
    console.log('Data channel opened');
    toast({ title: 'Chat Connected', description: 'You can now send and receive messages.' });
  };
  dc.onmessage = (event) => {
    try {
      const receivedMsgData = JSON.parse(event.data as string);
      // Validate structure if necessary before casting
      const receivedMsg: Omit<ChatMessage, 'id' | 'isOwn'> = {
        senderUid: receivedMsgData.senderUid,
        senderName: receivedMsgData.senderName,
        text: receivedMsgData.text,
        timestamp: receivedMsgData.timestamp,
      };
      setChatMessages(prev => [...prev, { ...receivedMsg, id: uuidv4(), isOwn: false }]);
    } catch (e) {
      console.error("Failed to parse chat message from data channel:", e, "Raw data:", event.data);
      toast({variant: "destructive", title: "Chat Error", description: "Received an unreadable message."})
    }
  };
  dc.onclose = () => {
    console.log('Data channel closed');
    toast({ title: 'Chat Disconnected', description: 'Message channel closed.', variant: 'destructive' });
  };
  dc.onerror = (errorEvent) => {
    // RTCErrorEvent might not be standard across all browsers or have a specific message property.
    const error = errorEvent as RTCErrorEvent; // Cast to access potential error details
    console.error('Data channel error:', error?.error?.message || error || errorEvent);
    toast({ variant: 'destructive', title: 'Chat Error', description: `An error occurred with the message channel: ${error?.error?.message || 'Unknown error'}` });
  };
  return dc;
};

export const sendChatMessageViaDataChannel = (
  dataChannel: RTCDataChannel | null,
  message: Omit<ChatMessage, 'id' | 'isOwn'>,
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>,
  toast: ToastSignature
): boolean => {
  if (!dataChannel) {
    toast({ variant: 'destructive', title: 'Chat Error', description: 'Message channel is not available.' });
    return false;
  }
  if (dataChannel.readyState !== 'open') {
    toast({ variant: 'destructive', title: 'Chat Error', description: 'Message channel is not open. Cannot send message.' });
    console.warn('Attempted to send message on non-open DataChannel. State:', dataChannel.readyState);
    return false;
  }
  try {
    dataChannel.send(JSON.stringify(message));
    // Add to local messages immediately for responsiveness (local echo)
    setChatMessages(prev => [...prev, { ...message, id: uuidv4(), isOwn: true }]);
    return true;
  } catch (error) {
    console.error("Error sending message via DataChannel:", error);
    toast({ variant: 'destructive', title: 'Chat Error', description: 'Could not send message.' });
    return false;
  }
};
