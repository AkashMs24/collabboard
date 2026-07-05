require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const routes = require('./routes');
const initSocket = require('./socket');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const logger = require('./config/logger');

const app = express();
const server = http.createServer(app);

const allowedOrigin = (origin, callback) => {
  if (!origin) return callback(null, true);
  // In development everything is proxied through the Vite dev server,
  // so allow all origins outside of production.
  if (process.env.NODE_ENV !== 'production') return callback(null, true);
  if (origin.endsWith('.vercel.app') || origin === process.env.CLIENT_URL) {
    return callback(null, true);
  }
  callback(new Error('Not allowed by CORS'));
};

const io = new Server(server, {
  cors: {
    origin: allowedOrigin,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

app.use(helmet());
app.use(cors({ origin: allowedOrigin, credentials: true }));
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(routes);
app.use(notFound);
app.use(errorHandler);
initSocket(io);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  logger.info(`CollabBoard server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = { app, server };
