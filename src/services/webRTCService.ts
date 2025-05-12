// src/services/webRTCService.ts
import type { Socket } from 'socket.io-client';
import { webrtcServersConfig } from '@/lib/webrtc/config';
import { setupDataChannelEventsHandler, sendChatMessageViaDataChannel } from '@/lib/webrtc/dataChannelHandler';
import type { ChatMessage } from '@/types/session';
import type { ToastSignature } from '@/hooks/use-toast';

interface MediaDeviceStatus {
  hasCamera: boolean;
  hasMicrophone: boolean;
  cameraError?: string;
  microphoneError?: string;
}

class WebRTCService {
  private socket: Socket;
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private onRemoteStreamCallback: ((stream: MediaStream) => void) | null = null;
  private onConnectionStateChangeCallback: ((state: RTCIceConnectionState) => void) | null = null;
  private setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>> | null = null;
  private toast: ToastSignature | null = null;
  private roomId: string | null = null;
  private reconnectionAttempts: number = 0;
  private maxReconnectionAttempts: number = 5;
  private reconnectionTimer: NodeJS.Timeout | null = null;
  private orientationChangeHandler: (() => void) | null = null;
  private userId: string | null = null;
  private userRole: 'reader' | 'client' | null = null;

  constructor(socketService: Socket, userId?: string, userRole?: 'reader' | 'client') {
    this.socket = socketService;
    this.userId = userId || null;
    this.userRole = userRole || null;
    this.setupSocketListeners();
  }

  private setupSocketListeners() {
    // Clean up any existing listeners to prevent duplicates
    this.socket.off('ice-candidate');
    this.socket.off('offer');
    this.socket.off('answer');
    this.socket.off('user-joined');
    this.socket.off('user-left');
    this.socket.off('session-ended');
    
    // Handle incoming ICE candidates
    this.socket.on('ice-candidate', async (data: { candidate: RTCIceCandidateInit, from: string, target?: string }) => {
      if (!this.peerConnection) return;
      
      // Only process candidates meant for this user or with no specific target
      if (data.target && this.userId && data.target !== this.userId) return;
      
      try {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
        console.log('Added received ICE candidate');
      } catch (e) {
        console.error("Error adding received ICE candidate", e);
      }
    });

    // Handle incoming offers
    this.socket.on('offer', async (data: { offer: RTCSessionDescriptionInit, from: string, target?: string }) => {
      if (!this.peerConnection) return;
      
      // Only process offers meant for this user or with no specific target
      if (data.target && this.userId && data.target !== this.userId) return;
      
      try {
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
        console.log('Set remote description from offer');
        
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);
        console.log('Created and set local description (answer)');
        
        // Send answer back
        this.socket.emit('answer', { 
          roomId: this.roomId, 
          answer, 
          target: data.from 
        });
      } catch (error) {
        console.error('Error handling offer:', error);
      }
    });
    
    // Handle incoming answers
    this.socket.on('answer', async (data: { answer: RTCSessionDescriptionInit, from: string, target?: string }) => {
      if (!this.peerConnection) return;
      
      // Only process answers meant for this user or with no specific target
      if (data.target && this.userId && data.target !== this.userId) return;
      
      try {
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
        console.log('Set remote description from answer');
      } catch (error) {
        console.error('Error handling answer:', error);
      }
    });
    
    // Handle user joining the room
    this.socket.on('user-joined', (data: { userId: string, userRole: string }) => {
      console.log(`User ${data.userId} (${data.userRole}) joined the room`);
      
      // If we're the initiator and a new user joined, send an offer
      if (this.peerConnection && this.userRole === 'reader') {
        this.createAndSendOffer();
      }
    });
    
    // Handle user leaving the room
    this.socket.on('user-left', (data: { userId: string, userRole: string }) => {
      console.log(`User ${data.userId} (${data.userRole}) left the room`);
      
      // If the other peer left, notify the UI
      if (this.onConnectionStateChangeCallback) {
        this.onConnectionStateChangeCallback('disconnected');
      }
    });
    
    // Handle session ended
    this.socket.on('session-ended', (data: { sessionId: string, endedBy: string, reason: string }) => {
      console.log(`Session ${data.sessionId} ended by ${data.endedBy}. Reason: ${data.reason}`);
      
      // Clean up resources
      this.disconnect();
      
      // Notify the UI
      if (this.onConnectionStateChangeCallback) {
        this.onConnectionStateChangeCallback('closed');
      }
    });
  }

  private isMobileDevice(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  private getMediaConstraints(): MediaStreamConstraints {
    if (this.isMobileDevice()) {
      return {
        video: {
          width: { max: 640 },
          height: { max: 480 },
          facingMode: 'user'
        },
        audio: true
      };
    } else {
      return {
        video: true,
        audio: true
      };
    }
  }

  async checkMediaDevices(): Promise<MediaDeviceStatus> {
    const status: MediaDeviceStatus = { hasCamera: false, hasMicrophone: false };
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      status.hasCamera = devices.some(device => device.kind === 'videoinput');
      status.hasMicrophone = devices.some(device => device.kind === 'audioinput');
      
      if (!status.hasCamera) status.cameraError = "No camera found.";
      if (!status.hasMicrophone) status.microphoneError = "No microphone found.";

    } catch (error: any) {
      console.error("Error enumerating devices:", error);
      status.cameraError = error.message || "Could not check camera.";
      status.microphoneError = error.message || "Could not check microphone.";
    }
    return status;
  }

  setupChatHandlers(
    setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>,
    toast: ToastSignature
  ) {
    this.setChatMessages = setChatMessages;
    this.toast = toast;
  }

  async initialize(roomId: string, userId: string, userRole: 'reader' | 'client'): Promise<MediaStream> {
    this.roomId = roomId;
    this.userId = userId;
    this.userRole = userRole;
    
    try {
      // Use device-appropriate constraints
      const constraints = this.getMediaConstraints();
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (error) {
      console.error('Error getting user media:', error);
      throw error;
    }

    // Use the ICE servers from the config
    this.peerConnection = new RTCPeerConnection(webrtcServersConfig);

    // Add all local tracks to the peer connection
    this.localStream.getTracks().forEach(track => {
      this.peerConnection?.addTrack(track, this.localStream!);
    });

    // Set up data channel for chat
    if (userRole === 'reader') {
      this.dataChannel = this.peerConnection.createDataChannel('chat', {
        ordered: true,
        maxRetransmits: 3
      });
      
      if (this.setChatMessages && this.toast) {
        setupDataChannelEventsHandler(this.dataChannel, this.setChatMessages, this.toast);
      }
    } else {
      this.peerConnection.ondatachannel = (event) => {
        this.dataChannel = event.channel;
        if (this.setChatMessages && this.toast) {
          setupDataChannelEventsHandler(this.dataChannel, this.setChatMessages, this.toast);
        }
      };
    }

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit('ice-candidate', { 
          roomId, 
          candidate: event.candidate, 
          target: userRole === 'reader' ? 'client' : 'reader' 
        });
      }
    };

    // Handle remote stream
    this.peerConnection.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        this.onRemoteStreamCallback?.(event.streams[0]);
      }
    };

    // Handle connection state changes and emit billing events
    this.peerConnection.oniceconnectionstatechange = () => {
      if (this.peerConnection) {
        const state = this.peerConnection.iceConnectionState;
        this.onConnectionStateChangeCallback?.(state);
        
        // Emit billing events based on connection state
        if (state === 'connected' || state === 'completed') {
          this.socket.emit('resume-billing', { roomId });
          console.log('WebRTC connection established, resuming billing');
          // Reset reconnection attempts when connected
          this.reconnectionAttempts = 0;
          if (this.reconnectionTimer) {
            clearTimeout(this.reconnectionTimer);
            this.reconnectionTimer = null;
          }
        } else if (state === 'disconnected' || state === 'failed') {
          this.socket.emit('pause-billing', { roomId });
          console.log('WebRTC connection interrupted, pausing billing');
          
          // Implement retry with exponential backoff
          this.attemptReconnection();
        } else if (state === 'closed') {
          this.socket.emit('pause-billing', { roomId });
          console.log('WebRTC connection closed, pausing billing');
          // Don't attempt reconnection for intentional closure
        }
      }
    };
    
    // Join the room
    this.socket.emit('join-room', roomId);
    
    // Add orientation change listener for mobile devices
    if (this.isMobileDevice()) {
      this.setupOrientationChangeHandler();
    }

    // Create and send offer if reader
    if (userRole === 'reader') {
      await this.createAndSendOffer();
    }

    if (!this.localStream) {
      throw new Error("Failed to get local media stream.");
    }
    return this.localStream;
  }

  private async createAndSendOffer() {
    if (!this.peerConnection || !this.roomId) return;
    
    try {
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      console.log('Created and set local description (offer)');
      
      this.socket.emit('offer', { 
        roomId: this.roomId, 
        offer,
        target: this.userRole === 'reader' ? 'client' : 'reader'
      });
    } catch (error) {
      console.error('Error creating offer:', error);
      throw error;
    }
  }

  onRemoteStream(callback: (stream: MediaStream) => void) {
    this.onRemoteStreamCallback = callback;
  }
  
  onConnectionStateChange(callback: (state: RTCIceConnectionState) => void) {
    this.onConnectionStateChangeCallback = callback;
  }

  toggleAudio(enable: boolean) {
    this.localStream?.getAudioTracks().forEach(track => track.enabled = enable);
  }

  toggleVideo(enable: boolean) {
    this.localStream?.getVideoTracks().forEach(track => track.enabled = enable);
  }

  sendChatMessage(message: Omit<ChatMessage, 'id' | 'isOwn'>): boolean {
    if (!this.dataChannel || !this.setChatMessages || !this.toast) {
      console.error('Chat not properly initialized');
      return false;
    }
    
    return sendChatMessageViaDataChannel(
      this.dataChannel,
      message,
      this.setChatMessages,
      this.toast
    );
  }

  private setupOrientationChangeHandler() {
    // Remove any existing handler
    if (this.orientationChangeHandler) {
      window.removeEventListener('orientationchange', this.orientationChangeHandler);
    }
    
    this.orientationChangeHandler = async () => {
      console.log('Orientation changed, renegotiating video tracks');
      
      // Wait for the orientation change to complete
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (!this.peerConnection || !this.localStream) return;
      
      try {
        // Get new media with updated orientation
        const newStream = await navigator.mediaDevices.getUserMedia(this.getMediaConstraints());
        
        // Replace tracks in the peer connection
        const senders = this.peerConnection.getSenders();
        const videoTrack = newStream.getVideoTracks()[0];
        const audioTrack = newStream.getAudioTracks()[0];
        
        if (videoTrack) {
          const videoSender = senders.find(sender => 
            sender.track?.kind === 'video'
          );
          if (videoSender) {
            await videoSender.replaceTrack(videoTrack);
          }
        }
        
        if (audioTrack) {
          const audioSender = senders.find(sender => 
            sender.track?.kind === 'audio'
          );
          if (audioSender) {
            await audioSender.replaceTrack(audioTrack);
          }
        }
        
        // Stop old tracks and update localStream
        this.localStream.getTracks().forEach(track => track.stop());
        this.localStream = newStream;
        
      } catch (error) {
        console.error('Error renegotiating media after orientation change:', error);
      }
    };
    
    window.addEventListener('orientationchange', this.orientationChangeHandler);
  }
  
  private attemptReconnection() {
    if (this.reconnectionAttempts >= this.maxReconnectionAttempts || !this.peerConnection) {
      console.log(`Max reconnection attempts (${this.maxReconnectionAttempts}) reached or peer connection is null`);
      return;
    }
    
    // Clear any existing timer
    if (this.reconnectionTimer) {
      clearTimeout(this.reconnectionTimer);
    }
    
    // Calculate backoff delay: 2^attempt * 1000ms (1s, 2s, 4s, 8s, 16s)
    const delay = Math.min(Math.pow(2, this.reconnectionAttempts) * 1000, 16000);
    console.log(`Attempting ICE reconnection in ${delay}ms (attempt ${this.reconnectionAttempts + 1}/${this.maxReconnectionAttempts})`);
    
    this.reconnectionTimer = setTimeout(() => {
      if (this.peerConnection) {
        console.log(`Executing ICE restart (attempt ${this.reconnectionAttempts + 1}/${this.maxReconnectionAttempts})`);
        this.peerConnection.restartIce();
        this.reconnectionAttempts++;
      }
    }, delay);
  }

  disconnect() {
    // Leave the room
    if (this.roomId) {
      this.socket.emit('leave-room', this.roomId);
    }
    
    // Clean up socket listeners
    this.socket.off('ice-candidate');
    this.socket.off('offer');
    this.socket.off('answer');
    this.socket.off('user-joined');
    this.socket.off('user-left');
    this.socket.off('session-ended');
    
    // Remove orientation change handler
    if (this.orientationChangeHandler) {
      window.removeEventListener('orientationchange', this.orientationChangeHandler);
      this.orientationChangeHandler = null;
    }
    
    // Clear any reconnection timer
    if (this.reconnectionTimer) {
      clearTimeout(this.reconnectionTimer);
      this.reconnectionTimer = null;
    }
    
    // Close data channel
    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }
    
    // Stop all tracks and close peer connection
    this.localStream?.getTracks().forEach(track => track.stop());
    this.peerConnection?.close();
    this.peerConnection = null;
    this.localStream = null;
    this.setChatMessages = null;
    this.toast = null;
    this.roomId = null;
    this.userId = null;
    this.userRole = null;
  }
}

export default WebRTCService;