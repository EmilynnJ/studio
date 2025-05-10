// src/services/chatService.ts
import type { Socket } from 'socket.io-client';

interface ChatMessage {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  timestamp: string; // ISO string
  roomId: string;
}

type MessageCallback = (message: ChatMessage) => void;

class ChatService {
  private socket: Socket;
  private onMessageCallback: MessageCallback | null = null;
  private roomId: string | null = null;
  private userId: string | null = null;
  private userName: string | null = null;

  constructor(socketService: Socket) {
    this.socket = socketService;
  }

  initialize(roomId: string, userId: string, userName: string) {
    this.roomId = roomId;
    this.userId = userId;
    this.userName = userName;

    this.socket.emit('join-chat-room', { roomId });

    this.socket.on('chat-message', (message: ChatMessage) => {
      if (message.roomId === this.roomId) {
        this.onMessageCallback?.(message);
      }
    });
    console.log(`ChatService initialized for room ${roomId} by user ${userId}`);
  }

  onMessage(callback: MessageCallback) {
    this.onMessageCallback = callback;
  }

  sendMessage(text: string): ChatMessage | null {
    if (!this.roomId || !this.userId || !this.userName) {
      console.error("ChatService not properly initialized to send message.");
      return null;
    }
    const message: ChatMessage = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 9), // basic unique ID
      text,
      senderId: this.userId,
      senderName: this.userName,
      timestamp: new Date().toISOString(),
      roomId: this.roomId,
    };
    this.socket.emit('send-chat-message', message);
    // Local echo can be handled by the component calling this, or here if preferred.
    // For now, assuming component handles local echo upon successful send.
    return message; 
  }

  disconnect() {
    if (this.roomId) {
      this.socket.emit('leave-chat-room', { roomId: this.roomId });
    }
    this.socket.off('chat-message'); // Remove specific listener
    console.log(`ChatService disconnected for room ${this.roomId}`);
  }
}

export default ChatService;
