import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import { setupSocketIO } from './services/socketService.js';
import { errorHandler } from './middleware/errorHandler.js';
import { seedDatabaseIfEmpty } from './scripts/seed.js';

import authRoutes from './routes/authRoutes.js';
import meetingRoutes from './routes/meetingRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import workspaceRoutes from './routes/workspaceRoutes.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Setup Socket.io
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
  }
});

setupSocketIO(io);

// Security & Optimization Middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
// Enhanced CORS handling for local dev, Render, and Vercel domains
const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:3000',
  'http://localhost:5173',
  'https://intellmeet.vercel.app'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.includes(origin) ||
      origin.endsWith('.vercel.app') ||
      origin.includes('localhost') ||
      process.env.NODE_ENV !== 'production'
    ) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(compression());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Rate limiting for production stability & OWASP mitigation
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000, // Generous limit for development & evaluation
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' }
});
app.use('/api', apiLimiter);

// Root Status Endpoint (Render & PaaS health probe support)
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    service: 'IntellMeet Enterprise API',
    version: '2.0.0',
    health: '/api/health',
    timestamp: new Date().toISOString()
  });
});

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    service: 'IntellMeet Enterprise API',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/workspaces', workspaceRoutes);

// Central Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Initialize Server & Database
const startServer = async () => {
  if (server.listening) return;
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`[Server] Port ${PORT} already active, attaching to existing instance...`);
    } else {
      console.error('[Server Error]', err);
    }
  });

  server.listen(PORT, async () => {
    console.log(`\n======================================================`);
    console.log(`🚀 IntellMeet Enterprise Server running on port ${PORT}`);
    console.log(`📡 Real-Time WebRTC & Socket.io Signaling Active`);
    console.log(`🧠 AI Meeting Intelligence Engine: Operational`);
    console.log(`🔗 Health Check: http://localhost:${PORT}/api/health`);
    console.log(`======================================================\n`);

    try {
      await connectDB();
      await seedDatabaseIfEmpty();
    } catch (dbErr) {
      console.warn('[Database] Initial connection notice:', dbErr.message);
    }
  });
};

startServer();

export { app, server };
