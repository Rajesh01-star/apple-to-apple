import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*", // Allow all origins for simplicity in P2P demo
    methods: ["GET", "POST"]
  }
});

// Track active rooms and their users
const rooms = new Map(); 

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    
    // Track who's in the room
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Set());
    }
    
    // Get existing users BEFORE adding this user
    const existingUsers = Array.from(rooms.get(roomId));
    
    // Now add this user
    rooms.get(roomId).add(socket.id);
    
    console.log(`Socket ${socket.id} joined room ${roomId}`);
    console.log(`Existing users in room:`, existingUsers);
    
    // Tell the NEW user about EXISTING users
    // For P2P mesh, we might want to connect to all, but for 2-peer sync:
    if (existingUsers.length > 0) {
      // Connect to the first peer found (assuming 1-to-1)
      socket.emit('user-connected', existingUsers[0]); 
    }
    
    // Tell EXISTING users about the NEW user
    socket.to(roomId).emit('user-connected', socket.id);
  });

  socket.on('offer', (payload) => {
    console.log(`Relaying offer from ${socket.id} to ${payload.target}`);
    io.to(payload.target).emit('offer', payload);
  });

  socket.on('answer', (payload) => {
    console.log(`Relaying answer from ${socket.id} to ${payload.target}`);
    io.to(payload.target).emit('answer', payload);
  });

  socket.on('ice-candidate', (payload) => {
    io.to(payload.target).emit('ice-candidate', payload);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    // Clean up rooms
    rooms.forEach((users, roomId) => {
      if (users.has(socket.id)) {
        users.delete(socket.id);
        // Notify others in the room
        socket.to(roomId).emit('user-disconnected', socket.id);
        
        if (users.size === 0) {
          rooms.delete(roomId);
        }
      }
    });
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Signaling server running on port ${PORT}`);
});
