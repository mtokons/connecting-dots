/**
 * JWT + bcrypt authentication module.
 *
 * Replaces HMAC-token + SHA-256 passwords with industry-standard:
 * - bcrypt for password hashing (auto-salted, 10 rounds)
 * - JWT for stateless tokens (24h expiry, HS256)
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db } from './db';

const JWT_SECRET = process.env.AUTH_SECRET || process.env.JWT_SECRET || 'change-me-in-production';
const JWT_EXPIRY = '24h';
const BCRYPT_ROUNDS = 10;

if (JWT_SECRET === 'change-me-in-production') {
  console.warn('⚠️  AUTH_SECRET not set — using insecure default. Set AUTH_SECRET in .env for production.');
}

// ─── Token Functions ─────────────────────────────────────────

export interface TokenPayload {
  email: string;
  role: string;
  name: string;
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    return decoded;
  } catch {
    return null;
  }
}

// ─── Password Functions ──────────────────────────────────────

export function hashPassword(plain: string): string {
  return bcrypt.hashSync(plain, BCRYPT_ROUNDS);
}

export function checkPassword(plain: string, hashed: string): boolean {
  // Support migration from old SHA-256 hashes
  if (!hashed.startsWith('$2a$') && !hashed.startsWith('$2b$')) {
    const crypto = require('crypto');
    const sha256 = crypto.createHash('sha256').update(plain).digest('hex');
    if (sha256 === hashed) return true;
    return false;
  }
  return bcrypt.compareSync(plain, hashed);
}

// ─── Seed Admin Users ────────────────────────────────────────

async function seedUsers() {
  const superEmail = process.env.SUPER_ADMIN_EMAIL || 'hasnain@mysccg.de';
  const superPw = process.env.SUPER_ADMIN_PASSWORD || 'Htokon@12';
  const existing = await db.findUserByEmail(superEmail);

  if (!existing) {
    await db.createUser({
      id: 'super-admin-id',
      email: superEmail,
      password: hashPassword(superPw),
      name: process.env.SUPER_ADMIN_NAME || 'MD Hasnain',
      role: 'super-admin',
      permissions: ['all'],
    });
    console.log(`✅ Super Admin seeded (${superEmail})`);
  } else if (!existing.password.startsWith('$2')) {
    // Migrate SHA-256 → bcrypt
    await db.updateUser(existing.id, { password: hashPassword(superPw) });
    console.log('🔄 Super Admin password migrated to bcrypt');
  }

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@connectingdot.studio';
  const adminPw = process.env.ADMIN_PASSWORD || 'ChangeMe123!';
  const adminExisting = await db.findUserByEmail(adminEmail);

  if (!adminExisting) {
    await db.createUser({
      id: 'admin-id',
      email: adminEmail,
      password: hashPassword(adminPw),
      name: process.env.ADMIN_NAME || 'Admin',
      role: 'admin',
      permissions: ['all'],
    });
    console.log(`✅ Admin seeded (${adminEmail})`);
  } else if (!adminExisting.password.startsWith('$2')) {
    await db.updateUser(adminExisting.id, { password: hashPassword(adminPw) });
    console.log('🔄 Admin password migrated to bcrypt');
  }
}

void seedUsers();

export default { signToken, verifyToken, hashPassword, checkPassword };
