import type { Request, Response, NextFunction } from 'express';

interface Bucket {
  count: number;
  resetAt: number;
}

/**
 * Tiny in-memory token-bucket rate limiter — no external deps.
 * Suitable for a single-process free-tier deployment. Replace with
 * Redis-backed limiter when scaling horizontally.
 */
export const rateLimit = (opts: { windowMs: number; max: number }) => {
  const buckets = new Map<string, Bucket>();

  return (req: Request, res: Response, next: NextFunction) => {
    const key =
      (req.ip ?? req.socket.remoteAddress ?? 'unknown') +
      '|' +
      (req.path.split('/').slice(0, 4).join('/') || req.path);
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt < now) {
      buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
      next();
      return;
    }

    if (bucket.count >= opts.max) {
      res.setHeader('Retry-After', Math.ceil((bucket.resetAt - now) / 1000).toString());
      res.status(429).json({ error: 'Too many requests' });
      return;
    }

    bucket.count += 1;
    next();
  };
};
