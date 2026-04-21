import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { Server } from 'socket.io';
import { initDatabase } from './config/database';
import { seedDatabase } from './data/seed';
import authRoutes from './routes/authRoutes';
import jobRoutes from './routes/jobRoutes';
import candidateRoutes from './routes/candidateRoutes';
import assessmentRoutes from './routes/assessmentRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import agentRoutes from './routes/agentRoutes';
import reportRoutes from './routes/reportRoutes';
import { setupInterviewSocket } from './websocket/interviewSocket';
import { errorHandler } from './middleware/errorHandler';

dotenv.config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/candidates', candidateRoutes);
app.use('/api/assessments', assessmentRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/reports', reportRoutes);

// WebSocket
setupInterviewSocket(io);

// Error handling
app.use(errorHandler);

const PORT = parseInt(process.env.PORT || '5000', 10);

async function start() {
  try {
    await initDatabase();
    await seedDatabase();

    server.listen(PORT, () => {
      console.log(`\n🚀 Server running on http://localhost:${PORT}`);
      console.log(`🔌 WebSocket ready`);
      const hasAI = !!process.env.OPENROUTER_API_KEY;
      const model = process.env.AI_MODEL || 'google/gemini-2.0-flash-exp:free';
      console.log(`🤖 AI Mode: ${hasAI ? `✅ OpenRouter (${model})` : '🎭 Mock/Demo Mode'}`);
      console.log(`\n📋 Demo Accounts:`);
      console.log(`   Admin:     admin@demo.com / password123`);
      console.log(`   Recruiter: recruiter@demo.com / password123`);
      console.log(`   Candidate: candidate@demo.com / password123\n`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

start().catch(console.error);

export { io };
