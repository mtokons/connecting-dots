/**
 * Auth middleware v2 — JWT-based.
 * Uses the new auth module for token verification.
 */

import type { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { verifyToken } from '../auth';

/**
 * Host-key OR Bearer-token auth middleware.
 * Accepts either a valid JWT Bearer token (admin/super-admin)
 * or a valid host key.
 */
export const requireHostKey = async (req: Request, res: Response, next: NextFunction) => {
  // Check Bearer token first (admin/super-admin JWT)
  const authHeader = req.header('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const payload = verifyToken(authHeader.slice(7));
    if (payload && (payload.role === 'admin' || payload.role === 'super-admin')) {
      (req as any).user = payload;
      next();
      return;
    }
  }

  // Fall back to host key
  const provided =
    (req.header('x-host-key') as string | undefined) ??
    (typeof req.query.hostKey === 'string' ? req.query.hostKey : undefined);

  const dbKey = await db.getSetting<string>('system_host_key');
  const expected = dbKey || process.env.HOST_KEY;

  if (!expected) {
    // No host key configured — allow (first-time setup)
    next();
    return;
  }

  if (!provided || provided !== expected) {
    res.status(401).json({ error: 'Unauthorized — valid credentials required' });
    return;
  }
  next();
};

/**
 * Require a valid admin JWT token (Bearer).
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.header('authorization');
  const token = authHeader?.replace('Bearer ', '') || '';
  const payload = verifyToken(token);

  if (!payload || (payload.role !== 'admin' && payload.role !== 'super-admin')) {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }

  (req as any).user = payload;
  next();
};
