const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const logger = require('../config/logger');

const initSocket = (io) => {
  // Auth middleware for socket
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('Authentication required'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const result = await pool.query(
        'SELECT id, name, avatar_color FROM users WHERE id = $1',
        [decoded.userId]
      );
      if (!result.rows[0]) return next(new Error('User not found'));

      socket.user = result.rows[0];
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    logger.info(`Socket connected: ${socket.user.name}`);

    await pool.query(
      'UPDATE users SET is_online = true, last_seen = NOW() WHERE id = $1',
      [socket.user.id]
    );

    // Join a board room
    socket.on('board:join', async (boardId) => {
      socket.join(`board:${boardId}`);
      socket.currentBoard = boardId;

      // Notify others someone joined
      socket.to(`board:${boardId}`).emit('user:joined', {
        user: socket.user,
        boardId,
      });

      // Send list of online users in this board
      const sockets = await io.in(`board:${boardId}`).fetchSockets();
      const onlineUsers = sockets.map(s => s.user).filter(Boolean);
      io.to(`board:${boardId}`).emit('board:online_users', { users: onlineUsers });
    });

    // Leave board
    socket.on('board:leave', (boardId) => {
      socket.leave(`board:${boardId}`);
      socket.to(`board:${boardId}`).emit('user:left', { userId: socket.user.id });
    });

    // Task events — broadcast to all in board except sender
    socket.on('task:created', (data) => {
      socket.to(`board:${data.boardId}`).emit('task:created', {
        ...data,
        actor: socket.user,
      });
    });

    socket.on('task:updated', (data) => {
      socket.to(`board:${data.boardId}`).emit('task:updated', {
        ...data,
        actor: socket.user,
      });
    });

    socket.on('task:moved', (data) => {
      socket.to(`board:${data.boardId}`).emit('task:moved', {
        ...data,
        actor: socket.user,
      });
    });

    socket.on('task:deleted', (data) => {
      socket.to(`board:${data.boardId}`).emit('task:deleted', {
        ...data,
        actor: socket.user,
      });
    });

    // Typing indicator
    socket.on('task:typing', (data) => {
      socket.to(`board:${data.boardId}`).emit('task:typing', {
        taskId: data.taskId,
        user: socket.user,
      });
    });

    // Comment events
    socket.on('comment:added', (data) => {
      socket.to(`board:${data.boardId}`).emit('comment:added', {
        ...data,
        actor: socket.user,
      });
    });

    // Cursor position (collaborative presence)
    socket.on('cursor:move', (data) => {
      socket.to(`board:${data.boardId}`).emit('cursor:move', {
        userId: socket.user.id,
        name: socket.user.name,
        color: socket.user.avatar_color,
        x: data.x,
        y: data.y,
      });
    });

    socket.on('disconnect', async () => {
      logger.info(`Socket disconnected: ${socket.user.name}`);
      await pool.query(
        'UPDATE users SET is_online = false, last_seen = NOW() WHERE id = $1',
        [socket.user.id]
      );

      if (socket.currentBoard) {
        socket.to(`board:${socket.currentBoard}`).emit('user:left', {
          userId: socket.user.id,
        });
      }
    });
  });
};

module.exports = initSocket;
