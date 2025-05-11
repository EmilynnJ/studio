// src/services/webRTCService.ts
import type { Socket } from 'socket.io-client';
import { webrtcServersConfig } from '@/lib/webrtc/config';
import { setupDataChannelEventsHandler } from '@/lib/webrtc/dataChannelHandler';
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

  constructor(socketService: Socket) {
    this.socket = socketService;
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

  async initialize(roomId: string, isInitiator: boolean): Promise<MediaStream> {
    this.roomId = roomId;
    
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
    if (isInitiator) {
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
          target: isInitiator ? 'callee' : 'caller' 
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
    
    // Set up socket event listeners for signaling
    this.setupSignalingListeners(roomId, isInitiator);
    
    // Add orientation change listener for mobile devices
    if (this.isMobileDevice()) {
      this.setupOrientationChangeHandler();
    }

    // Create and send offer if initiator
    if (isInitiator) {
      try {
        const offer = await this.peerConnection.createOffer();
        await this.peerConnection.setLocalDescription(offer);
        this.socket.emit('offer', { roomId, offer });
      } catch (error) {
        console.error('Error creating offer:', error);
        throw error;
      }
    }

    if (!this.localStream) {
      throw new Error("Failed to get local media stream.");
    }
    return this.localStream;
  }

  private setupSignalingListeners(roomId: string, isInitiator: boolean) {
    // Clean up any existing listeners to prevent duplicates
    this.socket.off('ice-candidate');
    this.socket.off('offer');
    this.socket.off('answer');
    
    // Handle incoming ICE candidates
    this.socket.on('ice-candidate', (data: { candidate: RTCIceCandidateInit }) => {
      if (!this.peerConnection) return;
      
      this.peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate))
        .catch(e => console.error("Error adding received ice candidate", e));
    });

    // Handle incoming offers (for non-initiator)
    this.socket.on('offer', async (data: { offer: RTCSessionDescriptionInit }) => {
      if (!isInitiator && this.peerConnection) {
        try {
          await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
          const answer = await this.peerConnection.createAnswer();
          await this.peerConnection.setLocalDescription(answer);
          this.socket.emit('answer', { roomId, answer });
        } catch (error) {
          console.error('Error handling offer:', error);
        }
      }
    });
    
    // Handle incoming answers (for initiator)
    this.socket.on('answer', async (data: { answer: RTCSessionDescriptionInit }) => {
      if (isInitiator && this.peerConnection) {
        try {
          await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
        } catch (error) {
          console.error('Error handling answer:', error);
        }
      }
    });
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
    
    return setupDataChannelEventsHandler.sendChatMessageViaDataChannel(
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
    // Clean up socket listeners
    if (this.roomId) {
      this.socket.off('ice-candidate');
      this.socket.off('offer');
      this.socket.off('answer');
    }
    
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
  }
}

export default WebRTCService;
