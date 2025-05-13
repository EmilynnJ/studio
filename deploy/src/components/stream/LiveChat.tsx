
'use client';

import React, { useState, useRef, useEffect, FormEvent } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, MessageCircle, UserCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AppUser } from '@/types/user'; // Assuming AppUser type is available

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: string;
  isSystem?: boolean;
}

interface LiveChatProps {
  messages: ChatMessage[];
  sendMessage: (text: string) => void;
  currentUser: AppUser | null;
}

const LiveChat: React.FC<LiveChatProps> = ({ messages, sendMessage, currentUser }) => {
  const [chatInput, setChatInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSendMessage = (e: FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !currentUser) return;
    sendMessage(chatInput.trim());
    setChatInput('');
  };

  return (
    <Card className="flex-grow flex flex-col bg-transparent border-0 shadow-none rounded-none">
      <CardHeader className="p-3 border-b border-border/30">
        <CardTitle className="text-lg font-alex-brush text-[hsl(var(--soulseer-header-pink))] flex items-center">
          <MessageCircle className="mr-2 h-5 w-5" /> Live Chat
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden p-0">
        <ScrollArea className="h-[calc(100%-0px)] p-3"> {/* Adjust height as needed */}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`mb-2.5 p-2 rounded-md max-w-[90%] clear-both ${
                msg.isSystem
                  ? 'bg-muted/50 text-xs text-center mx-auto italic text-muted-foreground float-none'
                  : msg.userId === currentUser?.uid
                  ? 'ml-auto bg-primary/20 text-right float-right'
                  : 'mr-auto bg-card/80 text-left float-left border border-border/30'
              }`}
            >
              {!msg.isSystem && (
                <p className="text-xs font-semibold text-primary mb-0.5 flex items-center">
                   <UserCircle className="w-3 h-3 mr-1 opacity-70"/> {msg.userName}
                  <span className="text-xs text-muted-foreground ml-1.5 opacity-70">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </p>
              )}
              <p className={`text-sm font-playfair-display text-foreground/90 break-words whitespace-pre-wrap ${msg.isSystem ? 'text-center' : ''}`}>
                {msg.text}
              </p>
            </div>
          ))}
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground font-playfair-display py-4 flex flex-col items-center justify-center h-full">
              <MessageCircle className="h-10 w-10 mb-2 text-muted-foreground/50" />
              Chat is quiet for now...
            </div>
          )}
          <div ref={messagesEndRef} />
        </ScrollArea>
      </CardContent>
      {currentUser && (
        <form onSubmit={handleSendMessage} className="p-3 border-t border-border/30 flex gap-2 items-center">
          <Input
            type="text"
            placeholder="Say something..."
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            className="bg-input text-foreground flex-grow h-9 text-sm"
            aria-label="Chat message input"
            maxLength={200}
          />
          <Button
            type="submit"
            size="icon"
            className="bg-primary text-primary-foreground h-9 w-9 flex-shrink-0 hover:bg-primary/90"
            disabled={!chatInput.trim()}
            aria-label="Send chat message"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      )}
    </Card>
  );
};

export default LiveChat;
