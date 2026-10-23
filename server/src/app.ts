import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import winston from 'winston';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Middleware
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000
});
app.use('/api', limiter);

export interface PeerPresence {
  socketId: string;
  deviceId: string;
  name: string;
  deviceType: string;
  platform: string;
  ip?: string;
  lastSeen: number;
}

const activePeers = new Map<string, PeerPresence>();

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    peersCount: activePeers.size
  });
});

app.get('/api/peers', (req, res) => {
  res.json(Array.from(activePeers.values()));
});

// Socket.io connection handling
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);

  socket.on('join-room', (roomId: string) => {
    socket.join(roomId);
    logger.info(`Socket ${socket.id} joined room ${roomId}`);
  });

  socket.on('register-presence', (data: { deviceId: string; name: string; deviceType: string; platform: string; ip?: string }) => {
    const peer: PeerPresence = {
      socketId: socket.id,
      deviceId: data.deviceId || socket.id,
      name: data.name || 'Anonymous Device',
      deviceType: data.deviceType || 'laptop',
      platform: data.platform || 'unknown',
      ip: data.ip || socket.handshake.address,
      lastSeen: Date.now()
    };

    activePeers.set(socket.id, peer);
    socket.join(peer.deviceId);
    logger.info(`Peer registered: ${peer.name} (${peer.deviceId})`);

    // Broadcast updated peer list to all connected clients
    io.emit('peers-update', Array.from(activePeers.values()));
  });

  socket.on('get-peers', (callback?: (peers: PeerPresence[]) => void) => {
    const list = Array.from(activePeers.values());
    if (typeof callback === 'function') {
      callback(list);
    } else {
      socket.emit('peers-update', list);
    }
  });

  socket.on('signal', (data: { to?: string; roomId?: string; signal: any }) => {
    const sender = activePeers.get(socket.id);
    const payload = {
      from: socket.id,
      fromDeviceId: sender?.deviceId,
      signal: data.signal
    };

    if (data.to) {
      // Forward to specific socket or room (e.g. deviceId)
      io.to(data.to).emit('signal', payload);
    } else if (data.roomId) {
      // Broadcast to room except sender
      socket.to(data.roomId).emit('signal', payload);
    } else {
      // Broadcast to all other sockets
      socket.broadcast.emit('signal', payload);
    }
  });

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
    if (activePeers.has(socket.id)) {
      activePeers.delete(socket.id);
      io.emit('peers-update', Array.from(activePeers.values()));
    }
  });
});

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  logger.info(`Vellichor signaling server running on port ${PORT}`);
});

export { app, io };
