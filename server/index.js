const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// In-memory store of clients in each room
const roomClients = {};

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Join a room
  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    if (!roomClients[roomId]) {
      roomClients[roomId] = new Set();
    }
    roomClients[roomId].add(socket.id);
    console.log(`Socket ${socket.id} joined room ${roomId}`);
    io.to(roomId).emit('room-clients', Array.from(roomClients[roomId]));
  });

  // Leave a room
  socket.on('leave-room', (roomId) => {
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
  });

  // WebRTC signaling
  socket.on('offer', (data) => {
    const { roomId, offer, target } = data;
    socket.to(roomId).emit('offer', { offer, from: socket.id, target });
  });

  socket.on('answer', (data) => {
    const { roomId, answer, target } = data;
    socket.to(roomId).emit('answer', { answer, from: socket.id, target });
  });

  socket.on('ice-candidate', (data) => {
    const { roomId, candidate, target } = data;
    socket.to(roomId).emit('ice-candidate', { candidate, from: socket.id, target });
  });

  // Session request/accept flows
  socket.on('session-request', (data) => {
    const { roomId, requestDetails, target } = data;
    socket.to(roomId).emit('session-request', { requestDetails, from: socket.id, target });
    console.log(`Session request in room ${roomId} from ${socket.id} to ${target}`);
  });

  socket.on('session-accepted', (data) => {
    const { roomId, acceptDetails, target } = data;
    socket.to(roomId).emit('session-accepted', { acceptDetails, from: socket.id, target });
    console.log(`Session accepted in room ${roomId} from ${socket.id} to ${target}`);
  });

  // Billing events
  socket.on('billing-update', (data) => {
    const { roomId, billingDetails, target } = data;
    socket.to(roomId).emit('billing-update', { billingDetails, from: socket.id, target });
    console.log(`Billing update in room ${roomId}:`, billingDetails);
  });

  socket.on('pause-billing', (data) => {
    const { roomId, pauseDetails, target } = data;
    socket.to(roomId).emit('pause-billing', { pauseDetails, from: socket.id, target });
    console.log(`Billing paused in room ${roomId} by ${socket.id}`);
  });

  socket.on('resume-billing', (data) => {
    const { roomId, resumeDetails, target } = data;
    socket.to(roomId).emit('resume-billing', { resumeDetails, from: socket.id, target });
    console.log(`Billing resumed in room ${roomId} by ${socket.id}`);
  });

  // Chat messaging
  socket.on('chat-message', (data) => {
    const { roomId, message } = data;
    io.to(roomId).emit('chat-message', { message, from: socket.id });
  });

  // Live gifting
  socket.on('gift-sent', (data) => {
    const { roomId, giftDetails, target } = data;
    io.to(roomId).emit('gift-sent', { giftDetails, from: socket.id, target });
    console.log(`Gift sent in room ${roomId} from ${socket.id} to ${target}:`, giftDetails);
  });

  // Handle disconnection
  socket.on('disconnecting', () => {
    socket.rooms.forEach((roomId) => {
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
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Health check route
app.get('/', (req, res) => {
  res.send('Socket server is running.');
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});