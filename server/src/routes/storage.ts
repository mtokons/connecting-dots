import { Router, Request, Response } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const router = Router();
const upload = multer({ dest: path.join(process.cwd(), 'recordings', '_tmp') });

const cloudinaryConfigured = () =>
  Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );

/**
 * POST /api/storage/upload — server-side signed Cloudinary upload.
 * Use this to push a local recording to the free 25 GB CDN.
 *
 * If Cloudinary isn't configured, returns a 503 with a clear message
 * rather than silently failing.
 */
router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'file field required (multipart/form-data)' });
    return;
  }

  if (!cloudinaryConfigured()) {
    fs.unlinkSync(req.file.path);
    res.status(503).json({
      error: 'Cloudinary not configured',
      hint: 'Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in server/.env',
    });
    return;
  }

  const folder = (req.body.folder as string | undefined) || 'connecting-dot';
  const publicId = (req.body.publicId as string | undefined) || `cd-${Date.now()}`;
  const timestamp = Math.floor(Date.now() / 1000).toString();

  // Cloudinary signature: sha1 of "folder=...&public_id=...&timestamp=..." + api_secret
  const params = new URLSearchParams({ folder, public_id: publicId, timestamp });
  const sortedSigBase = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  const signature = crypto
    .createHash('sha1')
    .update(sortedSigBase + process.env.CLOUDINARY_API_SECRET)
    .digest('hex');

  try {
    const fileBuffer = fs.readFileSync(req.file.path);
    const form = new FormData();
    form.append('file', new Blob([fileBuffer]), req.file.originalname || 'upload.bin');
    form.append('api_key', process.env.CLOUDINARY_API_KEY!);
    form.append('timestamp', timestamp);
    form.append('signature', signature);
    form.append('folder', folder);
    form.append('public_id', publicId);

    const url = `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/auto/upload`;
    const resp = await fetch(url, { method: 'POST', body: form });
    const data = (await resp.json()) as any;

    fs.unlinkSync(req.file.path);

    if (!resp.ok) {
      res.status(502).json({ error: 'Cloudinary upload failed', details: data });
      return;
    }

    res.json({
      provider: 'cloudinary',
      publicId: data.public_id,
      url: data.secure_url,
      bytes: data.bytes,
      format: data.format,
      duration: data.duration,
      resourceType: data.resource_type,
    });
  } catch (err) {
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({
      error: 'Upload failed',
      details: err instanceof Error ? err.message : 'Unknown',
    });
  }
});

// GET /api/storage/health
router.get('/health', (_req, res) => {
  res.json({ provider: cloudinaryConfigured() ? 'cloudinary' : 'local-only' });
});

export default router;
