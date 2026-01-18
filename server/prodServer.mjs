import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server } from 'socket.io';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;

// Initialize Next.js
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      // Be sure to pass `true` as the second argument to `url.parse`.
      // This tells it to parse the query portion of the URL.
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Initialize Socket.IO on the same HTTP server
  const io = new Server(server, {
    path: '/socket.io', // Standard path
    addTrailingSlash: false,
    cors: {
      origin: "*", // Allow connections from anywhere for this demo
      methods: ["GET", "POST"]
    }
  });

  // Track active rooms and their users (Copied from signaling.mjs)
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
      if (existingUsers.length > 0) {
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

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
