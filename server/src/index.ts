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
import path from 'path';
import { requireWorkspace, identifyWorkspace } from './middleware/workspace';
import { workspaceChannel } from './routes/workspaceChannel';
import { VideoProjects } from './services/videoProjects';
import { createVideoProjectsRouter } from './routes/videoProjects';
import { uploadVideoFile } from './services/youtubeUpload';

// New core modules (Phase 0)
import { db } from './db';        // SQLite — auto-migrates from db.json
import { initWs, onBinary, onMessage } from './ws';

// Routes
import streamRouter, { failOwnedStream, getFfmpegProcess, recordStreamInput, stopOwnedStream } from './routes/stream';
import recordingsRouter from './routes/recordings';
import livekitRouter from './routes/livekit';
import aiRouter from './routes/ai';
import episodesRouter from './routes/episodes';
import chatRouter from './routes/chat';
import storageRouter from './routes/storage';
import transcribeRouter from './routes/transcribe';
import socialRouter from './routes/social';

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
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
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
const channel = workspaceChannel(db);
app.use('/api/youtube', channel.router);

const videoProjects = new VideoProjects(path.resolve(process.env.VIDEO_SCRATCH_DIR || 'recordings/_editor'));
app.use('/api/video-projects', createVideoProjectsRouter(videoProjects, requireWorkspace,
  (filename, metadata, owner) => uploadVideoFile(filename, metadata, () => channel.getToken(owner))));
const cleanupTimer = setInterval(() => {
  void videoProjects.initialized.then(() => videoProjects.cleanup()).catch((error) => console.error('Video cleanup failed:', error));
}, 5 * 60 * 1000);
cleanupTimer.unref();
void videoProjects.initialized.catch((error) => console.error('Video project initialization failed:', error));

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
    videoEditor: true,
  });
});

// ─── HTTP + WebSocket Server ────────────────────────────────

const server = http.createServer(app);
server.on('close', () => clearInterval(cleanupTimer));

// Native WebSocket (replaces Socket.IO — single connection per client)
initWs(server, allowedOrigins);

// Wire binary WS messages (stream chunks) to FFmpeg stdin
const streamSources = new WeakMap<object, string>();
onMessage('stream:identify', (client, message) => {
  client.workspace = identifyWorkspace(typeof message.token === 'string' ? message.token : '') || undefined;
  console.log(`[stream:identify] client=${client.id} workspace=${client.workspace}`);
});
onMessage('stream:stop', (client, message) => {
  if (!client.workspace) return;
  stopOwnedStream(client.workspace);
  client.ws.send(JSON.stringify({ type: 'stream:drained', requestId: typeof message.requestId === 'string' ? message.requestId.slice(0, 64) : '' }));
});
onMessage('stream:disconnect', (client) => {
  const process = getFfmpegProcess(client.workspace || '');
  if (process && streamSources.get(process) === client.id) stopOwnedStream(client.workspace!);
});
onBinary((client, buf) => {
  const ffmpeg = getFfmpegProcess(client.workspace || '');
  if (!ffmpeg) {
    console.warn(`[onBinary] No ffmpeg process for client workspace=${client.workspace}`);
    return;
  }
  if (ffmpeg.stdin && !ffmpeg.stdin.destroyed && ffmpeg.stdin.writable) {
    const source = streamSources.get(ffmpeg);
    if (source && source !== client.id) return;
    streamSources.set(ffmpeg, client.id);
    try {
      if (ffmpeg.stdin.writableLength + buf.length > 8 * 1024 * 1024) {
        failOwnedStream(client.workspace!, 'The encoder could not keep up. Restart at 720p or reduce other server workloads.');
        return;
      }
      recordStreamInput(client.workspace!, buf.length);
      ffmpeg.stdin.write(buf, (err) => {
        if (err) failOwnedStream(client.workspace!, 'The video relay disconnected. Check your destination and restart.');
      });
    } catch {
      failOwnedStream(client.workspace!, 'The video relay disconnected. Check your destination and restart.');
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
