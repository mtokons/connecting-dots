/**
 * Connecting Dot Studio Server v2
 *
 * Express + native WebSocket (ws) server.
 * SQLite database, JWT+bcrypt auth, single WS connection per client.
 */

import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import http from 'http';

// New core modules (Phase 0)
import { db } from './db';        // SQLite — auto-migrates from db.json
import './auth';                  // Seeds admin users on import
import { initWs, onBinary } from './ws';

// Routes
import streamRouter, { getFfmpegProcess } from './routes/stream';
import recordingsRouter from './routes/recordings';
import livekitRouter from './routes/livekit';
import aiRouter from './routes/ai';
import episodesRouter from './routes/episodes';
import chatRouter from './routes/chat';
import storageRouter from './routes/storage';
import transcribeRouter from './routes/transcribe';
import socialRouter from './routes/social';
import youtubeRouter from './routes/youtube';
import authRouter from './routes/auth';

// ─── Express Setup ───────────────────────────────────────────

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS blocked: ${origin}`));
    },
  })
);

app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.use(express.json({ limit: '2mb' }));

// Health probe
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), ts: Date.now() });
});

// ─── Routes ──────────────────────────────────────────────────

app.use('/api/stream', streamRouter);
app.use('/api/recordings', recordingsRouter);
app.use('/api/livekit', livekitRouter);
app.use('/api/ai', aiRouter);
app.use('/api/episodes', episodesRouter);
app.use('/api/chat', chatRouter);
app.use('/api/storage', storageRouter);
app.use('/api/transcribe', transcribeRouter);
app.use('/api/social', socialRouter);
app.use('/api/youtube', youtubeRouter);
app.use('/api/auth', authRouter);

// Capability discovery
app.get('/api/capabilities', (_req, res) => {
  res.json({
    cloudDb: db.isCloud(),
    livekit: Boolean(process.env.LIVEKIT_API_KEY && process.env.LIVEKIT_API_SECRET),
    anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
    cloudStorage: Boolean(
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    ),
    transcription: Boolean(process.env.HUGGINGFACE_API_TOKEN),
    youtube: Boolean(
      process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_REDIRECT_URI
    ),
    social: {
      discord: Boolean(process.env.DISCORD_WEBHOOK_URL),
      slack: Boolean(process.env.SLACK_WEBHOOK_URL),
      telegram: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
      webhook: Boolean(process.env.GENERIC_WEBHOOK_URL),
    },
    version: process.env.APP_VERSION || '2.0.0',
  });
});

// ─── HTTP + WebSocket Server ────────────────────────────────

const server = http.createServer(app);

// Native WebSocket (replaces Socket.IO — single connection per client)
initWs(server, allowedOrigins);

// Wire binary WS messages (stream chunks) to FFmpeg stdin
onBinary((_client, buf) => {
  const ffmpeg = getFfmpegProcess();
  if (ffmpeg && ffmpeg.stdin && !ffmpeg.stdin.destroyed) {
    try {
      ffmpeg.stdin.write(buf);
    } catch (err: any) {
      if (err?.code !== 'EPIPE') {
        console.warn('stream:chunk write failed:', err?.message || err);
      }
    }
  }
});

// ─── Start ───────────────────────────────────────────────────

server.listen(PORT, () => {
  console.log('');
  console.log('🎙️  Connecting Dot Studio Server v2 — powered by SCCG');
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📡 API: http://localhost:${PORT}/api`);
  console.log(`🔌 WebSocket: ws://localhost:${PORT}/ws`);
  console.log(`💾 Database: SQLite (studio.db)`);
  console.log('');
});

export { app, server };
