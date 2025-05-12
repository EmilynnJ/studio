// server/socket.js
const { admin, firestore } = require('./firebase-admin');
const SignalingService = require('./services/signalingService');
const BillingService = require('./services/billingService');

// Track active rooms and clients
const roomClients = {};

exports.createSocketServer = (io, prisma) => {
  // Initialize services
  const signalingService = new SignalingService(io, prisma);
  const billingService = new BillingService(prisma);
  
  // WebRTC signaling server
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    const userId = socket.handshake.query.userId;
    
    if (userId) {
      console.log(`User ${userId} connected with socket ${socket.id}`);
      // Associate this socket with the user ID for private messages
      socket.join(`user:${userId}`);
      
      // Update user status to online if they're a reader
      updateUserStatus(userId, 'online');
    }

    // Join a specific room (session room or stream room)
    socket.on('join-room', async (roomId) => {
      socket.join(roomId);
      if (!roomClients[roomId]) {
        roomClients[roomId] = new Set();
      }
      roomClients[roomId].add(socket.id);
      console.log(`Socket ${socket.id} joined room ${roomId}`);
      
      // Get user role from database
      if (userId) {
        try {
          const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { role: true }
          });
          
          if (user) {
            // Notify signaling service
            await signalingService.joinRoom(socket, roomId, userId, user.role.toLowerCase());
          }
        } catch (error) {
          console.error('Error getting user role:', error);
        }
      }
      
      io.to(roomId).emit('room-clients', Array.from(roomClients[roomId]));
    });

    // Leave a room
    socket.on('leave-room', async (roomId) => {
      socket.leave(roomId);
      if (roomClients[roomId]) {
        roomClients[roomId].delete(socket.id);
        if (roomClients[roomId].size === 0) {
          delete roomClients[roomId];
        } else {
          io.to(roomId).emit('room-clients', Array.from(roomClients[roomId]));
        }
      }
      console.log(`Socket ${socket.id} left room ${roomId}`);
      
      // Get user role from database
      if (userId) {
        try {
          const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { role: true }
          });
          
          if (user) {
            // Notify signaling service
            await signalingService.leaveRoom(socket, roomId, userId, user.role.toLowerCase());
          }
        } catch (error) {
          console.error('Error getting user role:', error);
        }
      }
    });

    // WebRTC signaling: offer
    socket.on('offer', (data) => {
      const { roomId, offer, target } = data;
      signalingService.handleSignaling(socket, data, 'offer');
    });

    // WebRTC signaling: answer
    socket.on('answer', (data) => {
      const { roomId, answer, target } = data;
      signalingService.handleSignaling(socket, data, 'answer');
    });

    // WebRTC signaling: ICE candidate
    socket.on('ice-candidate', (data) => {
      const { roomId, candidate, target } = data;
      signalingService.handleSignaling(socket, data, 'ice-candidate');
    });

    // Session request from client to reader
    socket.on('session-request', async (data) => {
      const { roomId, requestDetails, target } = data;
      socket.to(roomId).emit('session-request', { requestDetails, from: socket.id, target });
      console.log(`Session request sent in room ${roomId} from ${socket.id} to ${target}`);
      
      try {
        // Create a session record in the database
        await prisma.session.create({
          data: {
            status: 'REQUESTED',
            clientId: requestDetails.clientId,
            readerId: requestDetails.readerId,
            notes: requestDetails.notes || null
          }
        });
      } catch (error) {
        console.error('Error creating session record:', error);
      }
    });

    // Session acceptance from reader to client
    socket.on('session-accepted', async (data) => {
      const { roomId, acceptDetails, target, sessionId } = data;
      socket.to(roomId).emit('session-accepted', { acceptDetails, from: socket.id, target });
      console.log(`Session accepted in room ${roomId} from ${socket.id} to ${target}`);
      
      try {
        // Update the session status in the database
        await prisma.session.update({
          where: { id: sessionId },
          data: { status: 'ACCEPTED' }
        });
      } catch (error) {
        console.error('Error updating session status:', error);
      }
    });

    // Session started
    socket.on('session-started', async (data) => {
      const { roomId, sessionId, startTime } = data;
      io.to(roomId).emit('session-started', { sessionId, startTime });
      console.log(`Session started in room ${roomId}, session ID: ${sessionId}`);
      
      try {
        // Start the session in the signaling service
        await signalingService.startSession(roomId);
        
        // Update the session in the database
        await prisma.session.update({
          where: { id: sessionId },
          data: { 
            status: 'STARTED',
            startTime: new Date(startTime)
          }
        });
        
        // Also update in Firestore
        await firestore.collection('videoSessions').doc(sessionId).update({
          status: 'active',
          startedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      } catch (error) {
        console.error('Error updating session start time:', error);
      }
    });

    // Session ended
    socket.on('session-ended', async (data) => {
      const { roomId, sessionId, endedBy, endTime, duration, totalAmount } = data;
      io.to(roomId).emit('session-ended', { sessionId, endedBy, endTime, duration, totalAmount });
      console.log(`Session ended in room ${roomId}, session ID: ${sessionId}`);
      
      try {
        // End the session in the signaling service
        await signalingService.endSession(roomId, duration, totalAmount);
        
        // End billing for the session
        await billingService.endBilling(sessionId, 'user_ended');
        
        // Update the session in the database
        await prisma.session.update({
          where: { id: sessionId },
          data: { 
            status: 'COMPLETED',
            endTime: new Date(endTime),
            duration,
            totalAmount: totalAmount ? totalAmount.toString() : null
          }
        });
        
        // Also update in Firestore
        await firestore.collection('videoSessions').doc(sessionId).update({
          status: 'ended',
          endedAt: admin.firestore.FieldValue.serverTimestamp(),
          totalMinutes: duration,
          amountCharged: totalAmount
        });
      } catch (error) {
        console.error('Error updating session end details:', error);
      }
    });

    // Billing updates during a session
    socket.on('billing-update', (data) => {
      const { roomId, billingDetails, target } = data;
      socket.to(roomId).emit('billing-update', { billingDetails, from: socket.id, target });
      console.log(`Billing update in room ${roomId}: ${JSON.stringify(billingDetails)}`);
    });

    // Pause billing during a session
    socket.on('pause-billing', async (data) => {
      const { roomId, sessionId } = data;
      socket.to(roomId).emit('pause-billing', { from: socket.id });
      console.log(`Billing paused in room ${roomId} by ${socket.id}`);
      
      if (sessionId) {
        try {
          await billingService.pauseBilling(sessionId);
        } catch (error) {
          console.error('Error pausing billing:', error);
        }
      }
    });

    // Resume billing during a session
    socket.on('resume-billing', async (data) => {
      const { roomId, sessionId } = data;
      socket.to(roomId).emit('resume-billing', { from: socket.id });
      console.log(`Billing resumed in room ${roomId} by ${socket.id}`);
      
      if (sessionId) {
        try {
          await billingService.resumeBilling(sessionId);
        } catch (error) {
          console.error('Error resuming billing:', error);
        }
      }
    });

    // Gift sent during a live session
    socket.on('gift-sent', async (data) => {
      const { roomId, giftDetails, target } = data;
      // Broadcast to everyone in the room including sender for UI updates
      io.to(roomId).emit('gift-sent', { giftDetails, from: socket.id, target });
      console.log(`Gift sent in room ${roomId} from ${socket.id} to ${target}: ${JSON.stringify(giftDetails)}`);
      
      try {
        // Record the gift in the database
        await prisma.gift.create({
          data: {
            amount: giftDetails.amount,
            message: giftDetails.message || null,
            sessionId: giftDetails.sessionId,
            fromUserId: giftDetails.fromUserId,
            toUserId: giftDetails.toUserId
          }
        });
        
        // Also record in Firestore
        await firestore.collection('gifts').add({
          amount: giftDetails.amount,
          message: giftDetails.message || null,
          sessionId: giftDetails.sessionId,
          fromUserId: giftDetails.fromUserId,
          toUserId: giftDetails.toUserId,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
      } catch (error) {
        console.error('Error processing gift:', error);
      }
    });

    // Handle disconnection
    socket.on('disconnecting', () => {
      const rooms = socket.rooms;
      rooms.forEach((roomId) => {
        if (roomClients[roomId]) {
          roomClients[roomId].delete(socket.id);
          if (roomClients[roomId].size === 0) {
            delete roomClients[roomId];
          } else {
            io.to(roomId).emit('room-clients', Array.from(roomClients[roomId]));
          }
        }
      });
      console.log('Client disconnecting:', socket.id);
      
      // Update user status to offline if they're a reader
      if (userId) {
        updateUserStatus(userId, 'offline');
      }
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  return io;
};

// Helper function to update user status in Firestore
async function updateUserStatus(userId, status) {
  try {
    const userDoc = await firestore.collection('users').doc(userId).get();
    if (userDoc.exists) {
      const userData = userDoc.data();
      if (userData.role === 'reader') {
        await firestore.collection('users').doc(userId).update({ status });
        console.log(`Updated user ${userId} status to ${status}`);
      }
    }
  } catch (error) {
    console.error('Error updating user status:', error);
  }
}