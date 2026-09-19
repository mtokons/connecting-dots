import { createHash } from 'crypto';
import type { Request, RequestHandler } from 'express';

export const workspaceOwner = (req: Request) => (req as Request & { user: { email: string } }).user.email;
export const identifyWorkspace = (token: string) => /^[a-f0-9]{64}$/.test(token)
  ? `workspace:${createHash('sha256').update(token).digest('hex')}` : null;

export const requireWorkspace: RequestHandler = (req, res, next) => {
  const token = req.header('x-workspace-token') || '';
  const owner = identifyWorkspace(token);
  if (!owner) {
    res.status(403).json({ error: 'Open a workspace in this browser to continue.' });
    return;
  }
  (req as Request & { user: { email: string } }).user = {
    email: owner,
  };
  next();
};