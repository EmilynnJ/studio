
import type { ChatMessage } from '@/types/session'; // Assuming ChatMessage type is defined
import { v4 as uuidv4 } from 'uuid';
import type { ToastSignature } from '@/hooks/use-toast';

export const setupDataChannelEventsHandler = (
  dc: RTCDataChannel,
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>,
  toast: ToastSignature
): RTCDataChannel => {
  dc.onopen = () => {
    console.log('Data channel opened');
    toast({ title: 'Chat Connected', description: 'You can now send messages.' });
  };
  dc.onmessage = (event) => {
    try {
      const receivedMsg: Omit<ChatMessage, 'id' | 'isOwn'> = JSON.parse(event.data as string);
      setChatMessages(prev => [...prev, { ...receivedMsg, id: uuidv4(), isOwn: false }]);
    } catch (e) {
      console.error("Failed to parse chat message:", e, "Raw data:", event.data);
      // Optionally inform user about malformed message
    }
  };
  dc.onclose = () => {
    console.log('Data channel closed');
    toast({ title: 'Chat Disconnected', description: 'Message channel closed.', variant: 'destructive' });
  };
  dc.onerror = (error) => {
    console.error('Data channel error:', error);
    toast({ variant: 'destructive', title: 'Chat Error', description: 'An error occurred with the message channel.' });
  };
  return dc;
};

export const sendChatMessageViaDataChannel = (
  dataChannel: RTCDataChannel | null,
  message: Omit<ChatMessage, 'id' | 'isOwn'>,
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>,
  toast: ToastSignature
): boolean => {
  if (!dataChannel || dataChannel.readyState !== 'open') {
    toast({ variant: 'destructive', title: 'Chat Error', description: 'Message channel is not open.' });
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
