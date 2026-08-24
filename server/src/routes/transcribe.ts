import { Router, Request, Response } from 'express';
import multer from 'multer';
import fs from 'fs';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

/**
 * POST /api/transcribe — proxy audio to Hugging Face Whisper (free tier).
 * Body: multipart/form-data with `audio` field (wav/mp3/webm <= 25 MB).
 *
 * Falls back to {text:''} when no token is configured so the client can
 * still rely on the browser Web Speech API for live captions.
 */
router.post('/', upload.single('audio'), async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'audio field required' });
    return;
  }

  const token = process.env.HUGGINGFACE_API_TOKEN;
  const model = process.env.HUGGINGFACE_WHISPER_MODEL || 'openai/whisper-base';

  if (!token) {
    res.json({
      text: '',
      provider: 'none',
      hint: 'Set HUGGINGFACE_API_TOKEN to enable server-side transcription',
    });
    return;
  }

  try {
    const url = `https://api-inference.huggingface.co/models/${model}`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': req.file.mimetype || 'application/octet-stream',
      },
      body: req.file.buffer,
    });

    if (!resp.ok) {
      const txt = await resp.text();
      res.status(502).json({ error: 'Whisper API error', details: txt.slice(0, 500) });
      return;
    }
    const data = (await resp.json()) as { text?: string };
    res.json({ provider: 'huggingface', model, text: data.text ?? '' });
  } catch (err) {
    res.status(500).json({
      error: 'Transcription failed',
      details: err instanceof Error ? err.message : 'Unknown',
    });
  }
});

export default router;
