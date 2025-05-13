// src/services/socketServer.ts
import { Server, Socket } from 'socket.io';
import http from 'http';

interface RoomClients {
  [roomId: string]: Set<string>;
}

const roomClients: RoomClients = {};

export function createSocketServer(server: http.Server) {
  const io = new Server(server, {
    cors: {
      origin: '*', // Adjust for production to restrict origins
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket: Socket) => {
    console.log('Client connected:', socket.id);

    socket.on('join-room', (roomId: string) => {
      socket.join(roomId);
      if (!roomClients[roomId]) {
        roomClients[roomId] = new Set();
      }
      roomClients[roomId].add(socket.id);
      console.log(`Socket ${socket.id} joined room ${roomId}`);
      io.to(roomId).emit('room-clients', Array.from(roomClients[roomId]));
    });

    socket.on('leave-room', (roomId: string) => {
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

    socket.on('offer', (data: any) => {
      const { roomId, offer, target } = data;
      socket.to(roomId).emit('offer', { offer, from: socket.id, target });
    });

    socket.on('answer', (data: any) => {
      const { roomId, answer, target } = data;
      socket.to(roomId).emit('answer', { answer, from: socket.id, target });
    });

    socket.on('ice-candidate', (data: any) => {
      const { roomId, candidate, target } = data;
      socket.to(roomId).emit('ice-candidate', { candidate, from: socket.id, target });
    });

    // Session request from client to reader
    socket.on('session-request', (data: any) => {
      const { roomId, requestDetails, target } = data;
      socket.to(roomId).emit('session-request', { requestDetails, from: socket.id, target });
      console.log(`Session request sent in room ${roomId} from ${socket.id} to ${target}`);
    });

    // Session acceptance from reader to client
    socket.on('session-accepted', (data: any) => {
      const { roomId, acceptDetails, target } = data;
      socket.to(roomId).emit('session-accepted', { acceptDetails, from: socket.id, target });
      console.log(`Session accepted in room ${roomId} from ${socket.id} to ${target}`);
    });

    // Billing updates during a session
    socket.on('billing-update', (data: any) => {
      const { roomId, billingDetails, target } = data;
      socket.to(roomId).emit('billing-update', { billingDetails, from: socket.id, target });
      console.log(`Billing update in room ${roomId}: ${JSON.stringify(billingDetails)}`);
    });

    // Pause billing during a session
    socket.on('pause-billing', (data: any) => {
      const { roomId, pauseDetails, target } = data;
      socket.to(roomId).emit('pause-billing', { pauseDetails, from: socket.id, target });
      console.log(`Billing paused in room ${roomId} by ${socket.id}`);
    });

    // Resume billing during a session
    socket.on('resume-billing', (data: any) => {
      const { roomId, resumeDetails, target } = data;
      socket.to(roomId).emit('resume-billing', { resumeDetails, from: socket.id, target });
      console.log(`Billing resumed in room ${roomId} by ${socket.id}`);
    });

    // Gift sent during a live session
    socket.on('gift-sent', (data: any) => {
      const { roomId, giftDetails, target } = data;
      // Broadcast to everyone in the room including sender for UI updates
      io.to(roomId).emit('gift-sent', { giftDetails, from: socket.id, target });
      console.log(`Gift sent in room ${roomId} from ${socket.id} to ${target}: ${JSON.stringify(giftDetails)}`);
    });

    socket.on('disconnecting', () => {
      const rooms: Set<string> = socket.rooms;
      rooms.forEach((roomId: string) => {
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

  return io;
}
