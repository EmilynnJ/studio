
// Placeholder for SocketService
import { io, Socket } from 'socket.io-client';

class SocketService {
  public socket: Socket | null = null;
  private readonly url = process.env.NEXT_PUBLIC_SIGNALING_SERVER_URL || 'http://localhost:3001'; // Default for local dev

  connect(userId?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket && this.socket.connected) {
        console.log('Socket already connected.');
        resolve();
        return;
      }

      console.log(`Attempting to connect to Socket.IO server at ${this.url} for user ${userId || 'anonymous'}`);
      // Pass userId as a query parameter for server-side identification
      this.socket = io(this.url, { 
        reconnectionAttempts: 5,
        query: userId ? { userId } : {} 
      });

      this.socket.on('connect', () => {
        console.log('Socket connected successfully. Socket ID:', this.socket?.id);
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        this.socket?.disconnect(); // Ensure fully disconnected on error
        this.socket = null;
        reject(error);
      });
      
      this.socket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
        // Handle disconnection logic if needed, e.g., notify user
        if (reason === 'io server disconnect') {
          // The server initiated the disconnection
          this.socket?.connect(); // Optionally attempt to reconnect
        }
        // Else, it might be a client-initiated disconnect or network issue
      });
    });
  }

  disconnect() {
    if (this.socket) {
      console.log('Disconnecting socket...');
      this.socket.disconnect();
      this.socket = null;
    }
  }

  emit(event: string, data: any) {
    if (this.socket) {
      this.socket.emit(event, data);
    } else {
      console.error('Socket not connected. Cannot emit event:', event);
    }
  }

  on(event: string, callback: (...args: any[]) => void) {
    if (this.socket) {
      this.socket.on(event, callback);
    } else {
      console.error('Socket not connected. Cannot listen to event:', event);
    }
  }

  off(event: string, callback?: (...args: any[]) => void) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }
}

// Export a singleton instance
const socketService = new SocketService();
export default socketService;
