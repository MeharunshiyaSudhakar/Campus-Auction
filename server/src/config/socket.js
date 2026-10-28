const { Server } = require('socket.io');

let io = null;

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log(`[Socket.io] Client connected: ${socket.id}`);

    // Join item room for real-time auction updates
    socket.on('join_auction', (listingId) => {
      socket.join(`auction:${listingId}`);
      console.log(`[Socket.io] Socket ${socket.id} joined auction:${listingId}`);
    });

    socket.on('leave_auction', (listingId) => {
      socket.leave(`auction:${listingId}`);
      console.log(`[Socket.io] Socket ${socket.id} left auction:${listingId}`);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.io] Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io has not been initialized!');
  }
  return io;
};

module.exports = { initSocket, getIO };
