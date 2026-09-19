import express, { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import path from 'path';
import { z } from 'zod';
import { CHUNK_BYTES, ProjectError, UPLOAD_TTL, VideoProjects, tokenMatches } from '../services/videoProjects';
import { PublishMetadata } from '../services/youtubeUpload';

type Handler = (req: Request, res: Response) => Promise<unknown>;
const handle = (action: Handler): RequestHandler => (req, res, next) => { void action(req, res).catch(next); };
const idOf = (req: Request) => String(req.params.id);
const ownerOf = (req: Request) => (req as Request & { user: { email: string } }).user.email;
const metadataSchema = z.object({ title: z.string().trim().min(1).max(100), description: z.string().max(5000),
  privacyStatus: z.enum(['private', 'unlisted', 'public']), madeForKids: z.boolean() });

export function createVideoProjectsRouter(store: VideoProjects, authenticate: RequestHandler,
  publish: (filename: string, metadata: PublishMetadata, owner: string) => Promise<string>) {
  const router = Router();
  let incomingChunks = 0;
  router.use((_req, _res, next) => { void store.initialized.then(() => next(), next); });
  router.use((_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); res.setHeader('Referrer-Policy', 'no-referrer'); next(); });

  const transfer: RequestHandler = (req, res, next) => {
    try {
      const project = store.get(idOf(req));
      if (Date.now() > project.uploadExpiresAt || !tokenMatches(req.header('x-upload-token') || '', project.uploadToken)) {
        throw new ProjectError('Transfer link expired or invalid. Generate a new link in the editor.', 403);
      }
      next();
    } catch (error) { next(error); }
  };
  const transferStatus = (id: string) => {
    const project = store.get(id);
    return { id, status: project.status, name: project.name, received: project.received, size: project.size,
      fingerprint: project.fingerprint, error: project.error, uploadExpiresAt: project.uploadExpiresAt };
  };
  router.get('/:id/transfer', transfer, handle(async (req, res) => res.json(transferStatus(idOf(req)))));
  router.post('/:id/transfer/start', transfer, handle(async (req, res) => {
    const input = z.object({ name: z.string().min(1).max(180), size: z.number().int(), fingerprint: z.string() }).parse(req.body);
    await store.beginUpload(idOf(req), input.name, input.size, input.fingerprint);
    res.json(transferStatus(idOf(req)));
  }));
  router.put('/:id/transfer/chunk', transfer, handle(async (req, res) => {
    if (incomingChunks >= 2) throw new ProjectError('Upload server is busy. Resume shortly.', 429);
    incomingChunks++;
    try {
      await store.exclusive(idOf(req), async (project) => {
        await new Promise<void>((resolve, reject) => {
          express.raw({ type: 'application/octet-stream', limit: CHUNK_BYTES })(req, res, (error) => error ? reject(error) : resolve());
        });
        if (!Buffer.isBuffer(req.body)) throw new ProjectError('Expected a binary video chunk.');
        const offset = Number(req.header('x-upload-offset'));
        if (!Number.isSafeInteger(offset) || offset < 0) throw new ProjectError('Invalid upload offset.');
        await store.append(project, offset, req.body);
      });
      res.json(transferStatus(idOf(req)));
    } finally { incomingChunks--; }
  }));
  router.post('/:id/transfer/finish', transfer, handle(async (req, res) => {
    await store.finishUpload(idOf(req));
    res.json(transferStatus(idOf(req)));
  }));
  router.get('/:id/media/:kind', handle(async (req, res) => {
    const project = store.get(idOf(req));
    if (!tokenMatches(String(req.query.token || ''), project.mediaToken)) throw new ProjectError('Media access denied.', 403);
    const kind = String(req.params.kind);
    if (kind !== 'source' && kind !== 'render') throw new ProjectError('Media not found.', 404);
    if (project.status === 'published' || !project.info || (kind === 'render' && project.status !== 'rendered')) {
      throw new ProjectError('Media is not available.', 404);
    }
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    if (kind === 'render') res.type('video/mp4');
    else res.type(/\.mov$/i.test(project.name) ? 'video/quicktime' : /\.webm$/i.test(project.name) ? 'video/webm' : 'video/mp4');
    await new Promise<void>((resolve, reject) => res.sendFile(path.join(store.directory(project.id), kind === 'source' ? 'source' : 'render.mp4'), (error) => error ? reject(error) : resolve()));
  }));

  router.use(authenticate);
  router.get('/', handle(async (req, res) => res.json(store.list(ownerOf(req)))));
  router.post('/', handle(async (req, res) => res.status(201).json(await store.create(ownerOf(req)))));
  router.use('/:id', (req, _res, next) => {
    try {
      if (store.get(idOf(req)).owner !== ownerOf(req)) throw new ProjectError('Project not found.', 404);
      next();
    } catch (error) { next(error); }
  });
  router.get('/:id', handle(async (req, res) => res.json(store.get(idOf(req)))));
  router.post('/:id/transfer-link', handle(async (req, res) => {
    const project = await store.exclusive(idOf(req), async (current) => {
      const { randomBytes } = await import('crypto');
      current.uploadToken = randomBytes(32).toString('hex');
      current.uploadExpiresAt = Date.now() + UPLOAD_TTL;
      await store.save(current);
      return current;
    });
    res.json(project);
  }));
  router.put('/:id/edit', handle(async (req, res) => res.json(await store.updateEdit(idOf(req), req.body))));
  router.post('/:id/render', handle(async (req, res) => res.status(202).json(await store.startRender(idOf(req)))));
  router.post('/:id/publish', handle(async (req, res) => {
    const metadata = metadataSchema.parse(req.body);
    res.status(202).json(await store.publish(idOf(req), (filename) => publish(filename, metadata, ownerOf(req))));
  }));
  router.delete('/:id', handle(async (req, res) => { await store.remove(idOf(req)); res.json({ deleted: true }); }));
  router.use((error: Error & { status?: number }, _req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) { next(error); return; }
    const code = error instanceof z.ZodError ? 400 : error.status || 500;
    if (code >= 500) console.error('Video project request failed:', error);
    res.status(code).json({ error: error instanceof z.ZodError ? 'Invalid project settings or upload metadata.'
      : code >= 500 ? 'Video service could not complete the request. Try again.' : error.message });
  });
  return router;
}