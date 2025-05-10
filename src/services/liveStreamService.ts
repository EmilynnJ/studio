
// Placeholder for LiveStreamService
// This service will encapsulate WebRTC logic, signaling via Socket.IO, etc.
import type { Socket } from 'socket.io-client';

type ViewerHandler = (viewer: { userId: string; userName: string }) => void;
type GiftHandler = (gift: { id: string; senderName: string; type: string; amount: number; timestamp: string }) => void;
type RemoteStreamHandler = (event: CustomEvent<MediaStream>) => void;


class LiveStreamService {
  private socket: Socket | null = null;
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private streamId: string | null = null;
  private isStreamer: boolean = false;
  private onRemoteStreamCallback: RemoteStreamHandler | null = null;


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
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

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
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

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


  async getUserMedia(): Promise<MediaStream> {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      return this.localStream;
    } catch (error) {
      console.error('Error accessing media devices.', error);
      throw error;
    }
  }

  async startStreaming(stream: MediaStream) {
    if (!this.socket || !this.streamId || !this.isStreamer) return;
    this.localStream = stream;
    
    // Streamer is ready, but waits for viewers to request connection
    this.socket.emit('start-stream', { streamId: this.streamId });
    console.log('Streamer started stream:', this.streamId);
  }
  
  joinStream() {
    if(!this.isStreamer && this.socket && this.streamId) {
        console.log(`Viewer joining stream: ${this.streamId}`);
        // Logic to set up peer connection as viewer and receive stream
        // This is simplified; a real implementation would involve SDP exchange
        this.setupViewerPeerConnection();
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
    this.localStream?.getTracks().forEach(track => track.stop());
    this.localStream = null;
    this.peerConnection?.close();
    this.peerConnection = null;
    // Socket listeners specific to this service instance might need removal if socket is shared
    // For now, assuming socket is disconnected globally or managed by socketService
    console.log('LiveStreamService cleaned up for stream:', this.streamId);
  }
}

export default LiveStreamService;
