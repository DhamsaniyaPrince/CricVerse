const socketIO = require('socket.io');

let io;

const initSocket = (server) => {
  io = socketIO(server, {
    cors: {
      origin: '*', // In production, replace with actual frontend URL
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log(`New Socket Client Connected: ${socket.id}`);

    // Join a specific match room for live scores and commentary
    socket.on('join_match_room', (matchId) => {
      socket.join(`match:${matchId}`);
      console.log(`Socket ${socket.id} joined room: match:${matchId}`);
    });

    // Join user room for notifications
    socket.on('join_user_room', (userId) => {
      socket.join(`user:${userId}`);
      console.log(`Socket ${socket.id} joined user room: user:${userId}`);
    });

    // Leave match room
    socket.on('leave_match_room', (matchId) => {
      socket.leave(`match:${matchId}`);
      console.log(`Socket ${socket.id} left room: match:${matchId}`);
    });

    socket.on('disconnect', () => {
      console.log(`Socket Client Disconnected: ${socket.id}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};

module.exports = { initSocket, getIO };
