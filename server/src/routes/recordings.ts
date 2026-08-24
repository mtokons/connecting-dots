import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import * as recordingManager from '../services/recordingManager';

const router = Router();

const RECORDINGS_DIR = path.join(process.cwd(), 'recordings');

// Ensure directory exists
if (!fs.existsSync(RECORDINGS_DIR)) {
  fs.mkdirSync(RECORDINGS_DIR, { recursive: true });
}

const upload = multer({ dest: RECORDINGS_DIR });
const chunkUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

// ─── Legacy: POST /api/recordings/save ────────────────────────

router.post('/save', upload.single('recording'), (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'No recording file provided' });
    return;
  }

  const timestamp = Date.now();
  const newFilename = `connecting-dot-${timestamp}-${uuidv4()}.webm`;
  const newPath = path.join(RECORDINGS_DIR, newFilename);

  fs.renameSync(req.file.path, newPath);

  res.json({
    status: 'saved',
    filename: newFilename,
    path: newPath,
    size: req.file.size,
    downloadUrl: `/api/recordings/download/${newFilename}`,
  });
});

// ─── Session-based recording ──────────────────────────────────

/** Start a new recording session */
router.post('/session/start', (req: Request, res: Response) => {
  try {
    const { roomId, episodeTitle, cameras } = req.body;
    if (!roomId) {
      res.status(400).json({ error: 'roomId is required' });
      return;
    }

    const session = recordingManager.startSession({ roomId, episodeTitle, cameras });
    res.json({
      sessionId: session.id,
      roomId: session.roomId,
      startedAt: session.startedAt.toISOString(),
      status: session.status,
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to start session' });
  }
});

/** Save a chunk to an active session */
router.post('/session/:sessionId/chunk', chunkUpload.single('chunk'), (req: Request, res: Response) => {
  try {
    const sessionId = Array.isArray(req.params.sessionId) ? req.params.sessionId[0] : req.params.sessionId;
    const chunkIndex = parseInt(req.body?.chunkIndex ?? '0', 10);

    if (!req.file) {
      res.status(400).json({ error: 'No chunk data provided' });
      return;
    }

    const result = recordingManager.saveChunk(sessionId, req.file.buffer, chunkIndex);
    res.json({ status: 'ok', bytesWritten: result.bytesWritten });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to save chunk' });
  }
});

/** Finalize a recording session */
router.post('/session/:sessionId/finalize', async (req: Request, res: Response) => {
  try {
    const sessionId = Array.isArray(req.params.sessionId) ? req.params.sessionId[0] : req.params.sessionId;
    const result = await recordingManager.finalizeSession(sessionId);
    res.json({
      status: 'complete',
      filename: result.filename,
      size: result.size,
      downloadUrl: `/api/recordings/download/${result.filename}`,
    });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to finalize session' });
  }
});

/** Get session status */
router.get('/session/:sessionId', (req: Request, res: Response) => {
  const sessionId = Array.isArray(req.params.sessionId) ? req.params.sessionId[0] : req.params.sessionId;
  const session = recordingManager.getSession(sessionId);
  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }
  res.json({
    id: session.id,
    roomId: session.roomId,
    status: session.status,
    totalBytes: session.totalBytes,
    chunksCount: session.chunkFiles.length,
    startedAt: session.startedAt.toISOString(),
    durationSeconds: (Date.now() - session.startedAt.getTime()) / 1000,
  });
});

/** List active recording sessions */
router.get('/sessions/active', (_req: Request, res: Response) => {
  const sessions = recordingManager.listActiveSessions();
  res.json(
    sessions.map((s) => ({
      id: s.id,
      roomId: s.roomId,
      status: s.status,
      totalBytes: s.totalBytes,
      startedAt: s.startedAt.toISOString(),
    }))
  );
});

// ─── File operations ──────────────────────────────────────────

/** Download a recording */
router.get('/download/:filename', (req: Request, res: Response) => {
  const filename = Array.isArray(req.params.filename) ? req.params.filename[0] : req.params.filename;

  // Validate filename to prevent path traversal
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    res.status(400).json({ error: 'Invalid filename' });
    return;
  }

  const filePath = path.join(RECORDINGS_DIR, filename);

  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: 'Recording not found' });
    return;
  }

  res.setHeader('Content-Type', 'video/webm');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.sendFile(filePath);
});

/** List all recordings */
router.get('/list', (_req: Request, res: Response) => {
  try {
    if (!fs.existsSync(RECORDINGS_DIR)) {
      res.json([]);
      return;
    }

    const files = fs.readdirSync(RECORDINGS_DIR)
      .filter((filename) => {
        // Skip dotfiles and known temp/working dirs (multer scratch space, etc.)
        if (filename.startsWith('.') || filename.startsWith('_')) return false;
        try {
          return fs.statSync(path.join(RECORDINGS_DIR, filename)).isFile();
        } catch {
          return false;
        }
      })
      .map((filename) => {
        const filePath = path.join(RECORDINGS_DIR, filename);
        const stats = fs.statSync(filePath);
        return {
          filename,
          size: stats.size,
          created: stats.birthtime.toISOString(),
        };
      })
      .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());

    res.json(files);
  } catch {
    res.json([]);
  }
});

/** Delete a recording */
router.delete('/:filename', (req: Request, res: Response) => {
  const filename = Array.isArray(req.params.filename) ? req.params.filename[0] : req.params.filename;
  const success = recordingManager.deleteRecording(filename);
  if (!success) {
    res.status(404).json({ error: 'Recording not found or invalid filename' });
    return;
  }
  res.json({ status: 'deleted', filename });
});

/** Get recording metadata */
router.get('/metadata/:sessionId', (req: Request, res: Response) => {
  const sessionId = Array.isArray(req.params.sessionId) ? req.params.sessionId[0] : req.params.sessionId;
  const meta = recordingManager.getRecordingMetadata(sessionId);
  if (!meta) {
    res.status(404).json({ error: 'Metadata not found' });
    return;
  }
  res.json(meta);
});

/** Get storage info */
router.get('/storage-info', (_req: Request, res: Response) => {
  const info = recordingManager.getStorageInfo();
  res.json(info);
});

export default router;
