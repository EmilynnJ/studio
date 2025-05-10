// src/services/webRTCService.ts
import type { Socket } from 'socket.io-client';

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
  private onRemoteStreamCallback: ((stream: MediaStream) => void) | null = null;
  private onConnectionStateChangeCallback: ((state: RTCIceConnectionState) => void) | null = null;

  constructor(socketService: Socket) {
    this.socket = socketService;
    // Initialize with STUN servers from config
    // Example: this.peerConnection = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
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

  async initialize(roomId: string, isInitiator: boolean): Promise<MediaStream> {
    // Placeholder for WebRTC initialization logic
    // Get user media, set up peer connection, signaling
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    } catch (error) {
      console.error('Error getting user media:', error);
      throw error;
    }

    this.peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }]
    });

    this.localStream.getTracks().forEach(track => {
      this.peerConnection?.addTrack(track, this.localStream!);
    });

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit('ice-candidate', { roomId, candidate: event.candidate, target: isInitiator ? 'callee' : 'caller' });
      }
    };

    this.peerConnection.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        this.onRemoteStreamCallback?.(event.streams[0]);
      }
    };

    this.peerConnection.oniceconnectionstatechange = () => {
        if (this.peerConnection) {
             this.onConnectionStateChangeCallback?.(this.peerConnection.iceConnectionState);
        }
    };
    
    this.socket.on('ice-candidate', (data: { candidate: RTCIceCandidateInit }) => {
        this.peerConnection?.addIceCandidate(new RTCIceCandidate(data.candidate)).catch(e => console.error("Error adding received ice candidate", e));
    });


    if (isInitiator) {
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      this.socket.emit('offer', { roomId, offer });
    }

    this.socket.on('offer', async (data: { offer: RTCSessionDescriptionInit }) => {
        if (!isInitiator) {
            await this.peerConnection?.setRemoteDescription(new RTCSessionDescription(data.offer));
            const answer = await this.peerConnection?.createAnswer();
            await this.peerConnection?.setLocalDescription(answer);
            this.socket.emit('answer', { roomId, answer });
        }
    });
    
    this.socket.on('answer', async (data: { answer: RTCSessionDescriptionInit }) => {
        if (isInitiator) {
            await this.peerConnection?.setRemoteDescription(new RTCSessionDescription(data.answer));
        }
    });


    if (!this.localStream) {
      throw new Error("Failed to get local media stream.");
    }
    return this.localStream;
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

  disconnect() {
    this.localStream?.getTracks().forEach(track => track.stop());
    this.peerConnection?.close();
    this.peerConnection = null;
    this.localStream = null;
    // Socket disconnection should be handled by SocketService instance
  }
}

export default WebRTCService;
