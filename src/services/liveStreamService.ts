
// Placeholder for LiveStreamService
// This service will encapsulate WebRTC logic, signaling via Socket.IO, etc.
import type { Socket } from 'socket.io-client';

type ViewerHandler = (viewer: { userId: string; userName: string }) => void;
type GiftHandler = (gift: { id: string; senderName: string; type: string; amount: number; timestamp: string }) => void;
type RemoteStreamHandler = (event: CustomEvent<MediaStream>) => void;

// Mobile detection utility
const isMobile = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
         (window.innerWidth <= 768);
};

// Media constraints based on device type
interface MediaConstraintsOptions {
  forceMobile?: boolean;
  highQuality?: boolean;
}

const getMediaConstraints = (options: MediaConstraintsOptions = {}): MediaStreamConstraints => {
  const { forceMobile, highQuality } = options;
  const mobile = forceMobile || isMobile();
  
  // Default constraints
  const constraints: MediaStreamConstraints = {
    audio: true,
    video: true
  };
  
  // Enhanced video constraints
  if (constraints.video !== false) {
    const videoConstraints: MediaTrackConstraints = {
      facingMode: 'user'
    };
    
    if (mobile && !highQuality) {
      // Lower resolution for mobile to save bandwidth
      videoConstraints.width = { ideal: 640 };
      videoConstraints.height = { ideal: 480 };
      videoConstraints.frameRate = { max: 24 };
    } else {
      // Higher quality for desktop or when explicitly requested
      videoConstraints.width = { ideal: 1280 };
      videoConstraints.height = { ideal: 720 };
      videoConstraints.frameRate = { ideal: 30 };
    }
    
    constraints.video = videoConstraints;
  }
  
  return constraints;
};


class LiveStreamService {
  private socket: Socket | null = null;
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private streamId: string | null = null;
  private isStreamer: boolean = false;
  private onRemoteStreamCallback: RemoteStreamHandler | null = null;
  private reconnectionAttempts: number = 0;
  private maxReconnectionAttempts: number = 5;
  private reconnectionDelay: number = 1000; // Starting delay in ms
  private orientationChangeHandler: (() => void) | null = null;


  initialize(
    socketInstance: Socket,
    streamId: string,
    isStreamer: boolean,
    onViewerJoin: ViewerHandler,
    onViewerLeave: ViewerHandler,
    onGiftReceived: GiftHandler,
    onRemoteStream: RemoteStreamHandler // Callback for remote stream
  ) {
    this.socket = socketInstance;
    this.streamId = streamId;
    this.isStreamer = isStreamer;
    this.onRemoteStreamCallback = onRemoteStream;

    console.log(`LiveStreamService initialized for stream: ${streamId}, as ${isStreamer ? 'streamer' : 'viewer'}`);

    // Common socket event listeners
    this.socket.on('viewer-joined', onViewerJoin);
    this.socket.on('viewer-left', onViewerLeave);
    this.socket.on('gift-received', onGiftReceived);
    
    if (!isStreamer) {
      // Viewer specific logic
      this.socket.emit('join-stream', { streamId });
      this.setupViewerPeerConnection();
      this.socket.on('offer-from-streamer', async ({ offer, streamerSocketId }) => {
        console.log('Viewer received offer from streamer', offer);
        if (this.peerConnection) {
          await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
          const answer = await this.peerConnection.createAnswer();
          await this.peerConnection.setLocalDescription(answer);
          this.socket?.emit('answer-to-streamer', { answer, to: streamerSocketId, streamId: this.streamId });
        }
      });
      this.socket.on('ice-candidate-from-streamer', ({ candidate }) => {
         console.log('Viewer received ICE candidate from streamer', candidate);
        this.peerConnection?.addIceCandidate(new RTCIceCandidate(candidate)).catch(e => console.error("Error adding ICE candidate (viewer):", e));
      });
    } else {
        // Streamer specific logic
        this.socket.on('request-offer', ({ viewerSocketId }) => { // A viewer wants to connect
            console.log('Streamer received request-offer from viewer:', viewerSocketId);
            this.setupStreamerPeerConnection(viewerSocketId);
        });
        this.socket.on('answer-from-viewer', async ({ answer, viewerSocketId }) => {
            console.log('Streamer received answer from viewer', viewerSocketId, answer);
            // For streamer, peerConnection might need to be specific to each viewer or use a different approach for 1-to-many
            // This simple model assumes one primary peerConnection, which is not ideal for multiple viewers directly via WebRTC
            // For now, let's assume this POC focuses on one viewer connecting for simplicity or an SFU handles multiple.
            // If we are connecting to a specific viewer, we need to get their PC instance.
            // This needs a more robust PC management for streamer to multiple viewers.
             if (this.peerConnection && this.peerConnection.signalingState !== "stable") { // Check if PC is ready for an answer
                 try {
                    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
                    console.log('Streamer set remote description (answer from viewer)');
                 } catch(e) {
                    console.error("Streamer: Error setting remote description (answer):", e);
                 }
            } else {
                console.warn("Streamer: PeerConnection not ready or already stable when answer received from viewer", viewerSocketId);
            }
        });
         this.socket.on('ice-candidate-from-viewer', ({ candidate, viewerSocketId }) => {
            console.log('Streamer received ICE candidate from viewer', viewerSocketId, candidate);
            this.peerConnection?.addIceCandidate(new RTCIceCandidate(candidate)).catch(e => console.error("Error adding ICE candidate (streamer):", e));
        });

    }
    return this;
  }

  private setupStreamerPeerConnection(viewerSocketId: string) {
    // For a real 1-to-many, an SFU is needed. This is a simplified 1-to-1 for POC.
    // Or, the streamer creates a new PC for each viewer. This is complex.
    // For this example, we'll re-use/re-create one PC for simplicity, implying only one viewer connects at a time this way.
    if(this.peerConnection) {
        this.peerConnection.close();
    }

    this.peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
      ]
    });
    
    // Handle ICE connection state changes
    this.peerConnection.oniceconnectionstatechange = this.handleICEConnectionStateChange.bind(this);

    this.localStream?.getTracks().forEach(track => {
        if(this.localStream && this.peerConnection) {
             this.peerConnection.addTrack(track, this.localStream);
        }
    });

    this.peerConnection.onicecandidate = event => {
      if (event.candidate && this.socket) {
        this.socket.emit('ice-candidate-to-viewer', { candidate: event.candidate, to: viewerSocketId, streamId: this.streamId });
      }
    };
    
    this.peerConnection.createOffer()
      .then(offer => this.peerConnection!.setLocalDescription(offer))
      .then(() => {
        if(this.socket && this.peerConnection?.localDescription) {
            this.socket.emit('offer-to-viewer', { offer: this.peerConnection.localDescription, to: viewerSocketId, streamId: this.streamId });
        }
      })
      .catch(e => console.error("Error creating offer (streamer):", e));
  }

  private setupViewerPeerConnection() {
    this.peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
      ]
    });
    
    // Handle ICE connection state changes
    this.peerConnection.oniceconnectionstatechange = this.handleICEConnectionStateChange.bind(this);

    this.peerConnection.ontrack = event => {
      console.log('Viewer: Track received', event.track, event.streams);
      if (event.streams && event.streams[0]) {
        if (this.onRemoteStreamCallback) {
            const customEvent = new CustomEvent<MediaStream>('remoteStream', { detail: event.streams[0] });
            this.onRemoteStreamCallback(customEvent); // Dispatch custom event
        }
      }
    };
    
    this.peerConnection.onicecandidate = event => {
      if (event.candidate && this.socket) {
        this.socket.emit('ice-candidate-to-streamer', { candidate: event.candidate, streamId: this.streamId });
      }
    };
    
    // Viewer requests the offer from the streamer
    this.socket.emit('request-offer-from-streamer', { streamId: this.streamId });
  }


  async getUserMedia(options: MediaConstraintsOptions = {}): Promise<MediaStream> {
    try {
      const constraints = getMediaConstraints(options);
      console.log('Getting user media with constraints:', constraints);
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Set up orientation change handler for mobile devices
      this.setupOrientationChangeHandler();
      
      return this.localStream;
    } catch (error) {
      console.error('Error accessing media devices.', error);
      throw error;
    }
  }
  
  private setupOrientationChangeHandler() {
    // Remove any existing handler
    if (this.orientationChangeHandler) {
      window.removeEventListener('orientationchange', this.orientationChangeHandler);
      this.orientationChangeHandler = null;
    }
    
    if (isMobile() && this.localStream) {
      this.orientationChangeHandler = async () => {
        console.log('Orientation changed, adjusting video constraints');
        
        // Wait for the orientation change to complete
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Get current video track
        const videoTrack = this.localStream?.getVideoTracks()[0];
        if (!videoTrack) return;
        
        // Apply new constraints based on new orientation
        const isPortrait = window.innerHeight > window.innerWidth;
        try {
          await videoTrack.applyConstraints({
            width: { ideal: isPortrait ? 480 : 640 },
            height: { ideal: isPortrait ? 640 : 480 },
            frameRate: { max: 24 }
          });
          console.log('Applied new constraints after orientation change');
        } catch (error) {
          console.error('Failed to apply new constraints after orientation change', error);
        }
      };
      
      window.addEventListener('orientationchange', this.orientationChangeHandler);
    }
  }
  
  private handleICEConnectionStateChange() {
    if (!this.peerConnection) return;
    
    const connectionState = this.peerConnection.iceConnectionState;
    console.log('ICE connection state changed:', connectionState);
    
    switch (connectionState) {
      case 'disconnected':
        console.log('ICE disconnected, attempting to recover...');
        this.attemptICERestart();
        break;
      case 'failed':
        console.log('ICE connection failed, attempting restart with backoff...');
        this.attemptICERestartWithBackoff();
        break;
      case 'connected':
      case 'completed':
        // Reset reconnection attempts on successful connection
        this.reconnectionAttempts = 0;
        break;
    }
  }
  
  private attemptICERestart() {
    if (!this.peerConnection || !this.socket || !this.streamId) return;
    
    // For the streamer, create a new offer with ICE restart
    if (this.isStreamer) {
      this.peerConnection.createOffer({ iceRestart: true })
        .then(offer => this.peerConnection!.setLocalDescription(offer))
        .then(() => {
          if (this.socket && this.peerConnection?.localDescription && this.streamId) {
            // Notify all connected viewers about the ICE restart
            this.socket.emit('streamer-ice-restart', { 
              offer: this.peerConnection.localDescription, 
              streamId: this.streamId 
            });
          }
        })
        .catch(e => console.error("Error creating ICE restart offer:", e));
    } else {
      // For viewers, request a new offer from the streamer
      this.socket.emit('request-ice-restart', { streamId: this.streamId });
    }
  }
  
  private attemptICERestartWithBackoff() {
    if (this.reconnectionAttempts >= this.maxReconnectionAttempts) {
      console.log('Max reconnection attempts reached, giving up');
      return;
    }
    
    // Calculate exponential backoff delay
    const delay = this.reconnectionDelay * Math.pow(2, this.reconnectionAttempts);
    this.reconnectionAttempts++;
    
    console.log(`Attempting ICE restart in ${delay}ms (attempt ${this.reconnectionAttempts}/${this.maxReconnectionAttempts})`);
    
    setTimeout(() => {
      this.attemptICERestart();
    }, delay);
  }

  async startStreaming(stream: MediaStream, options: MediaConstraintsOptions = {}) {
    if (!this.socket || !this.streamId || !this.isStreamer) return;
    
    // If no stream is provided, get one with the specified options
    if (!stream) {
      stream = await this.getUserMedia(options);
    } else {
      this.localStream = stream;
      // Still set up orientation change handler even if stream is provided externally
      this.setupOrientationChangeHandler();
    }
    
    // Streamer is ready, but waits for viewers to request connection
    this.socket.emit('start-stream', { streamId: this.streamId });
    console.log('Streamer started stream:', this.streamId);
    
    // Set up socket listeners for ICE restart requests from viewers
    this.socket.on('request-ice-restart', ({ viewerSocketId }) => {
      console.log('Received ICE restart request from viewer:', viewerSocketId);
      if (this.peerConnection) {
        this.setupStreamerPeerConnection(viewerSocketId); // This will create a new PC with fresh ICE candidates
      }
    });
  }
  
  joinStream(options: MediaConstraintsOptions = {}) {
    if(!this.isStreamer && this.socket && this.streamId) {
        console.log(`Viewer joining stream: ${this.streamId} with options:`, options);
        // Logic to set up peer connection as viewer and receive stream
        this.setupViewerPeerConnection();
        
        // Set up socket listener for ICE restart from streamer
        this.socket.on('streamer-ice-restart', async ({ offer }) => {
          console.log('Received ICE restart offer from streamer');
          if (this.peerConnection) {
            try {
              await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
              const answer = await this.peerConnection.createAnswer();
              await this.peerConnection.setLocalDescription(answer);
              this.socket?.emit('answer-to-streamer', { 
                answer, 
                streamId: this.streamId 
              });
              console.log('Sent answer after ICE restart');
            } catch (e) {
              console.error("Error handling ICE restart offer:", e);
            }
          }
        });
    }
  }

  toggleAudio(stream: MediaStream): boolean {
    const audioTrack = stream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      return audioTrack.enabled;
    }
    return false;
  }

  toggleVideo(stream: MediaStream): boolean {
    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      return videoTrack.enabled;
    }
    return false;
  }

  async sendGift(giftData: { type: string; amount: number; streamerId: string; senderId: string; senderName: string; }) {
    if (!this.socket || !this.streamId) {
        console.error("Socket or StreamId not available for sending gift");
        throw new Error("Cannot send gift. Connection issue.");
    }
    // Here, you might first process payment via Stripe on the backend
    // For now, we'll just emit the event
    console.log("Emitting send-gift with data:", { streamId: this.streamId, ...giftData });
    this.socket.emit('send-gift', { streamId: this.streamId, ...giftData });

    // Placeholder for actual payment processing:
    // const response = await fetch('/api/gifts/send', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ streamId: this.streamId, ...giftData }),
    // });
    // if (!response.ok) {
    //   const errorData = await response.json();
    //   throw new Error(errorData.message || 'Failed to process gift payment');
    // }
  }

  endStreaming() {
    if (this.isStreamer && this.socket && this.streamId) {
      this.socket.emit('end-stream', { streamId: this.streamId });
    }
    this.cleanup();
  }

  cleanup() {
    // Remove orientation change handler
    if (this.orientationChangeHandler) {
      window.removeEventListener('orientationchange', this.orientationChangeHandler);
      this.orientationChangeHandler = null;
    }
    
    // Remove socket listeners specific to this instance
    if (this.socket) {
      this.socket.off('streamer-ice-restart');
      this.socket.off('request-ice-restart');
    }
    
    this.localStream?.getTracks().forEach(track => track.stop());
    this.localStream = null;
    this.peerConnection?.close();
    this.peerConnection = null;
    // Reset reconnection state
    this.reconnectionAttempts = 0;
    
    console.log('LiveStreamService cleaned up for stream:', this.streamId);
  }
}

export default LiveStreamService;
