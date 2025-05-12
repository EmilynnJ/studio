// server/services/signalingService.js
const { firestore } = require('../firebase-admin');

class SignalingService {
  constructor(io, prisma) {
    this.io = io;
    this.prisma = prisma;
    this.activeRooms = new Map(); // Track active rooms and their participants
  }

  // Initialize a new WebRTC session
  async initializeSession(sessionId, readerId, clientId) {
    try {
      // Create a session document in Firestore
      await firestore.collection('videoSessions').doc(sessionId).set({
        readerId,
        clientId,
        status: 'initializing',
        createdAt: new Date(),
        signaling: {
          offers: [],
          answers: [],
          iceCandidates: []
        }
      });

      // Create a unique room for this session
      this.activeRooms.set(sessionId, {
        readerId,
        clientId,
        readerConnected: false,
        clientConnected: false,
        startTime: null,
        endTime: null
      });

      return { success: true, sessionId };
    } catch (error) {
      console.error('Error initializing WebRTC session:', error);
      return { success: false, error: error.message };
    }
  }

  // Handle a user joining a WebRTC room
  async joinRoom(socket, roomId, userId, userRole) {
    socket.join(roomId);
    
    const room = this.activeRooms.get(roomId);
    if (room) {
      if (userRole === 'reader') {
        room.readerConnected = true;
      } else if (userRole === 'client') {
        room.clientConnected = true;
      }
      
      // Notify others in the room that a new user has joined
      socket.to(roomId).emit('user-joined', { userId, userRole });
      
      // If both users are connected, mark the room as ready
      if (room.readerConnected && room.clientConnected) {
        this.io.to(roomId).emit('room-ready', { roomId });
        
        // Update session status in Firestore
        await firestore.collection('videoSessions').doc(roomId).update({
          status: 'connecting',
          updatedAt: new Date()
        });
      }
    }
  }

  // Handle a user leaving a WebRTC room
  async leaveRoom(socket, roomId, userId, userRole) {
    socket.leave(roomId);
    
    const room = this.activeRooms.get(roomId);
    if (room) {
      if (userRole === 'reader') {
        room.readerConnected = false;
      } else if (userRole === 'client') {
        room.clientConnected = false;
      }
      
      // Notify others in the room that a user has left
      socket.to(roomId).emit('user-left', { userId, userRole });
      
      // If both users are disconnected, clean up the room
      if (!room.readerConnected && !room.clientConnected) {
        this.activeRooms.delete(roomId);
        
        // Update session status in Firestore
        await firestore.collection('videoSessions').doc(roomId).update({
          status: 'ended',
          endedAt: new Date()
        });
      }
    }
  }

  // Handle WebRTC signaling (offers, answers, ICE candidates)
  async handleSignaling(socket, data, signalType) {
    const { roomId, target } = data;
    
    // Store signaling data in Firestore for persistence
    try {
      const sessionRef = firestore.collection('videoSessions').doc(roomId);
      
      if (signalType === 'offer') {
        await sessionRef.update({
          'signaling.offers': firestore.FieldValue.arrayUnion({
            from: socket.id,
            offer: data.offer,
            timestamp: new Date()
          })
        });
      } else if (signalType === 'answer') {
        await sessionRef.update({
          'signaling.answers': firestore.FieldValue.arrayUnion({
            from: socket.id,
            answer: data.answer,
            timestamp: new Date()
          })
        });
      } else if (signalType === 'ice-candidate') {
        await sessionRef.update({
          'signaling.iceCandidates': firestore.FieldValue.arrayUnion({
            from: socket.id,
            candidate: data.candidate,
            timestamp: new Date()
          })
        });
      }
    } catch (error) {
      console.error(`Error storing ${signalType} in Firestore:`, error);
    }
    
    // Forward the signal to the target peer
    socket.to(roomId).emit(signalType, {
      ...data,
      from: socket.id
    });
  }

  // Start a session and begin billing
  async startSession(roomId) {
    const room = this.activeRooms.get(roomId);
    if (room) {
      const startTime = new Date();
      room.startTime = startTime;
      
      // Update session status in Firestore
      await firestore.collection('videoSessions').doc(roomId).update({
        status: 'active',
        startedAt: startTime
      });
      
      // Update session status in database
      await this.prisma.session.update({
        where: { id: roomId },
        data: {
          status: 'STARTED',
          startTime
        }
      });
      
      return { success: true, startTime };
    }
    
    return { success: false, error: 'Room not found' };
  }

  // End a session and finalize billing
  async endSession(roomId, duration, totalAmount) {
    const room = this.activeRooms.get(roomId);
    if (room) {
      const endTime = new Date();
      room.endTime = endTime;
      
      // Update session status in Firestore
      await firestore.collection('videoSessions').doc(roomId).update({
        status: 'ended',
        endedAt: endTime,
        totalMinutes: duration,
        amountCharged: totalAmount
      });
      
      // Update session status in database
      await this.prisma.session.update({
        where: { id: roomId },
        data: {
          status: 'COMPLETED',
          endTime,
          duration,
          totalAmount: totalAmount.toString()
        }
      });
      
      // Clean up the room
      this.activeRooms.delete(roomId);
      
      return { success: true, endTime };
    }
    
    return { success: false, error: 'Room not found' };
  }
}

module.exports = SignalingService;