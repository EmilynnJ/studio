
'use client';

import React, { useState, useRef, useEffect, FormEvent } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MessageSquare, Send, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ChatMessage } from '@/types/session';
import type { AppUser } from '@/types/user';
import { useToast } from '@/hooks/use-toast';
import { sendChatMessageViaDataChannel } from '@/lib/webrtc/dataChannelHandler';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  dataChannel: RTCDataChannel | null;
  currentUser: AppUser | null;
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>; // For local echo
  isMediaSession: boolean; // To adjust height based on video feeds
  callStatus: 'connected' | 'connecting' | 'idle' | 'disconnected' | 'ended' | 'error' | string; // Allow more statuses
}

export function ChatInterface({
  messages,
  dataChannel,
  currentUser,
  setChatMessages,
  isMediaSession,
  callStatus
}: ChatInterfaceProps) {
  const [chatInput, setChatInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSendMessage = (e: FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !currentUser || !dataChannel) return;

    const messageToSend: Omit<ChatMessage, 'id' | 'isOwn'> = {
      senderUid: currentUser.uid,
      senderName: currentUser.name || 'User',
      text: chatInput.trim(),
      timestamp: new Date().toISOString(),
    };

    if (sendChatMessageViaDataChannel(dataChannel, messageToSend, setChatMessages, toast)) {
      setChatInput('');
    }
  };
  
  const chatDisabled = callStatus !== 'connected' || !dataChannel || dataChannel.readyState !== 'open';

  return (
    <Card className={`bg-[hsl(var(--card))] border-[hsl(var(--border)/0.7)] shadow-xl flex flex-col ${!isMediaSession ? 'h-[calc(80vh-var(--header-height)-var(--footer-height)-7rem)] min-h-[400px]' : 'max-h-[calc(var(--video-card-height,300px)*1.5)] sm:max-h-[calc(var(--video-card-height,350px)*1.5)]'} w-full`}>
      <CardHeader className="py-2 px-3 sm:py-3 sm:px-4">
        <CardTitle className="text-base sm:text-lg md:text-xl font-alex-brush text-[hsl(var(--soulseer-header-pink))] flex items-center">
          <MessageSquare className="mr-2 h-4 w-4 sm:h-5 sm:w-5" /> Session Chat
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden p-0">
        <ScrollArea className={`${!isMediaSession ? 'h-[calc(100%-110px)]' : 'h-[200px] sm:h-[250px] md:h-[300px] lg:h-[calc(100%-70px)]'} p-2 sm:p-3 md:p-4`}>
          {messages.map((msg) => (
            <div key={msg.id} className={`mb-2 sm:mb-3 p-2 sm:p-3 rounded-lg max-w-[85%] shadow-sm ${msg.isOwn ? 'ml-auto bg-[hsl(var(--primary)/0.3)] text-right' : 'mr-auto bg-[hsl(var(--muted))] text-left'}`}>
              <p className="text-xs text-muted-foreground font-semibold">
                {msg.senderName} 
                <span className="text-xs opacity-70 ml-1">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </p>
              <p className="text-sm font-playfair-display text-foreground/90 break-words whitespace-pre-wrap">{msg.text}</p>
            </div>
          ))}
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground font-playfair-display py-4 flex flex-col items-center justify-center h-full">
              <Users className="h-10 w-10 sm:h-12 sm:w-12 mb-2 sm:mb-3 text-muted-foreground/50" />
              No messages yet.
            </div>
          )}
          <div ref={messagesEndRef} />
        </ScrollArea>
      </CardContent>
      <form onSubmit={handleSendMessage} className="p-2 sm:p-3 md:p-4 border-t border-[hsl(var(--border)/0.5)] flex gap-2 items-center">
        <Input
          type="text"
          placeholder="Type your message..."
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          className="bg-input text-foreground flex-grow h-9 sm:h-10 text-sm"
          disabled={chatDisabled}
          aria-label="Chat message input"
        />
        <Button 
            type="submit" 
            size="icon" 
            className="bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0" 
            disabled={chatDisabled || !chatInput.trim()}
            aria-label="Send chat message"
        >
          <Send className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>
      </form>
    </Card>
  );
}
