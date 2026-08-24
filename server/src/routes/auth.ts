/**
 * Auth routes v2 — JWT + bcrypt.
 * Imports signToken/verifyToken/checkPassword from the new auth module.
 */

import { Router, Request, Response } from 'express';
import { db } from '../db';
import { signToken, verifyToken, hashPassword, checkPassword } from '../auth';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password required' });
    return;
  }

  const user = await db.findUserByEmail(email);
  if (!user) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  if (!checkPassword(password, user.password)) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  // If password is still SHA-256 format, migrate to bcrypt on successful login
  if (!user.password.startsWith('$2')) {
    await db.updateUser(user.id, { password: hashPassword(password) });
  }

  const token = signToken({ email: user.email, role: user.role, name: user.name });
  res.json({
    token,
    user: { email: user.email, name: user.name, role: user.role },
  });
});

// GET /api/auth/me — verify token
router.get('/me', (req: Request, res: Response) => {
  const authHeader = req.header('authorization');
  const token = authHeader?.replace('Bearer ', '') || '';
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }
  res.json({ email: payload.email, role: payload.role, name: payload.name });
});

// POST /api/auth/settings/host-key — update host key (admin only)
router.post('/settings/host-key', async (req: Request, res: Response) => {
  const authHeader = req.header('authorization');
  const token = authHeader?.replace('Bearer ', '') || req.body.token || '';
  const payload = verifyToken(token);

  if (!payload || (payload.role !== 'admin' && payload.role !== 'super-admin')) {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }

  const { newHostKey } = req.body;
  if (!newHostKey || newHostKey.length < 8) {
    res.status(400).json({ error: 'Host Key must be at least 8 characters' });
    return;
  }

  await db.setSetting('system_host_key', newHostKey);
  process.env.HOST_KEY = newHostKey;
  res.json({ success: true, message: 'Host Key updated' });
});

export default router;
