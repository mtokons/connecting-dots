/**
 * SQLite database layer — replaces JSON file + Firestore.
 *
 * Uses better-sqlite3 for synchronous, ACID-compliant persistence.
 * WAL journal mode for concurrent read performance.
 * Auto-migrates schema on first run.
 */

import Database from 'better-sqlite3';
import path from 'path';

const DB_FILE = process.env.DB_PATH || path.join(__dirname, '..', 'studio.db');

const sqlite = new Database(DB_FILE);

// Performance: WAL mode + synchronous NORMAL gives durability without blocking
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('synchronous = NORMAL');
sqlite.pragma('foreign_keys = ON');

// ─── Schema Migration ────────────────────────────────────────

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id          TEXT PRIMARY KEY,
    email       TEXT UNIQUE NOT NULL,
    password    TEXT NOT NULL,
    name        TEXT NOT NULL DEFAULT '',
    role        TEXT NOT NULL DEFAULT 'admin',
    permissions TEXT NOT NULL DEFAULT '["all"]',
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS episodes (
    id          TEXT PRIMARY KEY,
    title       TEXT NOT NULL DEFAULT '',
    host        TEXT NOT NULL DEFAULT '',
    guest       TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    image_url   TEXT NOT NULL DEFAULT '',
    status      TEXT NOT NULL DEFAULT 'draft',
    date        TEXT NOT NULL DEFAULT '',
    time        TEXT NOT NULL DEFAULT '',
    tags        TEXT NOT NULL DEFAULT '[]',
    room_id     TEXT NOT NULL DEFAULT '',
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS chat_messages (
    id         TEXT PRIMARY KEY,
    room_id    TEXT NOT NULL,
    author     TEXT NOT NULL DEFAULT 'Guest',
    message    TEXT NOT NULL DEFAULT '',
    platform   TEXT NOT NULL DEFAULT 'Backstage',
    channel    TEXT NOT NULL DEFAULT 'backstage',
    pinned     INTEGER NOT NULL DEFAULT 0,
    deleted    INTEGER NOT NULL DEFAULT 0,
    ts         INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_chat_room ON chat_messages(room_id);

  CREATE TABLE IF NOT EXISTS integrations (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL DEFAULT ''
  );
`);

// ─── Prepared Statements ─────────────────────────────────────

const stmts = {
  // Users
  findUserByEmail: sqlite.prepare('SELECT * FROM users WHERE email = ?'),
  createUser: sqlite.prepare(
    'INSERT OR REPLACE INTO users (id, email, password, name, role, permissions) VALUES (?, ?, ?, ?, ?, ?)'
  ),
  updateUser: sqlite.prepare(
    'UPDATE users SET password = COALESCE(?, password), name = COALESCE(?, name), role = COALESCE(?, role) WHERE id = ? OR email = ?'
  ),

  // Episodes
  listEpisodes: sqlite.prepare('SELECT * FROM episodes ORDER BY date DESC'),
  getEpisode: sqlite.prepare('SELECT * FROM episodes WHERE id = ?'),
  getEpisodeByRoom: sqlite.prepare('SELECT * FROM episodes WHERE room_id = ? OR id = ?'),
  createEpisode: sqlite.prepare(
    'INSERT OR REPLACE INTO episodes (id, title, host, guest, description, image_url, status, date, time, tags, room_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ),
  updateEpisode: sqlite.prepare(
    'UPDATE episodes SET title=COALESCE(?,title), host=COALESCE(?,host), guest=COALESCE(?,guest), description=COALESCE(?,description), image_url=COALESCE(?,image_url), status=COALESCE(?,status), date=COALESCE(?,date), time=COALESCE(?,time), tags=COALESCE(?,tags), room_id=COALESCE(?,room_id) WHERE id=?'
  ),
  deleteEpisode: sqlite.prepare('DELETE FROM episodes WHERE id = ?'),

  // Settings
  getSetting: sqlite.prepare('SELECT value FROM settings WHERE key = ?'),
  setSetting: sqlite.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)'),

  // Chat
  appendChat: sqlite.prepare(
    'INSERT INTO chat_messages (id, room_id, author, message, platform, channel, pinned, deleted, ts) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ),
  listChat: sqlite.prepare(
    'SELECT * FROM chat_messages WHERE room_id = ? AND deleted = 0 ORDER BY ts DESC LIMIT ?'
  ),
  deleteChat: sqlite.prepare('UPDATE chat_messages SET deleted = 1 WHERE id = ?'),

  // Integrations
  getIntegration: sqlite.prepare('SELECT value FROM integrations WHERE key = ?'),
  setIntegration: sqlite.prepare('INSERT OR REPLACE INTO integrations (key, value) VALUES (?, ?)'),
};

// ─── Public API (same interface, drop-in replacement) ────────

function parseEpisode(row: any): any {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    host: row.host,
    guest: row.guest,
    description: row.description,
    imageUrl: row.image_url,
    status: row.status,
    date: row.date,
    time: row.time,
    tags: JSON.parse(row.tags || '[]'),
    roomId: row.room_id,
  };
}

export const db = {
  isCloud: () => false, // SQLite is always local

  // USERS ─────────────────────────────────────────────────────
  async findUserByEmail(email: string) {
    return stmts.findUserByEmail.get(email) as any | undefined ?? null;
  },

  async createUser(user: { id: string; email: string; password: string; name: string; role: string; permissions: string[] }) {
    stmts.createUser.run(user.id, user.email, user.password, user.name, user.role, JSON.stringify(user.permissions));
  },

  async updateUser(id: string, fields: Record<string, any>) {
    stmts.updateUser.run(fields.password ?? null, fields.name ?? null, fields.role ?? null, id, id);
  },

  // EPISODES ──────────────────────────────────────────────────
  async listEpisodes() {
    const rows = stmts.listEpisodes.all();
    return rows.map(parseEpisode);
  },

  async getEpisode(id: string) {
    return parseEpisode(stmts.getEpisode.get(id));
  },

  async getEpisodeByRoom(roomId: string) {
    return parseEpisode(stmts.getEpisodeByRoom.get(roomId, roomId));
  },

  async createEpisode(ep: any) {
    stmts.createEpisode.run(
      ep.id, ep.title || '', ep.host || '', ep.guest || '', ep.description || '',
      ep.imageUrl || ep.image_url || '', ep.status || 'draft', ep.date || '', ep.time || '',
      JSON.stringify(ep.tags || []), ep.roomId || ep.room_id || ep.id
    );
    return ep;
  },

  async updateEpisode(id: string, updates: any) {
    stmts.updateEpisode.run(
      updates.title ?? null, updates.host ?? null, updates.guest ?? null,
      updates.description ?? null, updates.imageUrl ?? updates.image_url ?? null,
      updates.status ?? null, updates.date ?? null, updates.time ?? null,
      updates.tags ? JSON.stringify(updates.tags) : null,
      updates.roomId ?? updates.room_id ?? null, id
    );
    return this.getEpisode(id);
  },

  async deleteEpisode(id: string) {
    stmts.deleteEpisode.run(id);
  },

  // SETTINGS ──────────────────────────────────────────────────
  async getSetting<T = any>(key: string): Promise<T | null> {
    const row = stmts.getSetting.get(key) as { value: string } | undefined;
    if (!row) return null;
    try { return JSON.parse(row.value); } catch { return row.value as any; }
  },

  async setSetting(key: string, value: any) {
    stmts.setSetting.run(key, typeof value === 'string' ? value : JSON.stringify(value));
  },

  // CHAT ──────────────────────────────────────────────────────
  async appendChat(msg: any) {
    stmts.appendChat.run(
      msg.id, msg.roomId || msg.room_id, msg.author || 'Guest',
      msg.message || '', msg.platform || 'Backstage', msg.channel || 'backstage',
      msg.pinned ? 1 : 0, msg.deleted ? 1 : 0, msg.ts || Date.now()
    );
  },

  async listChat(roomId: string, limit = 200) {
    const rows = stmts.listChat.all(roomId, limit) as any[];
    return rows.reverse().map(r => ({
      id: r.id, roomId: r.room_id, author: r.author, message: r.message,
      platform: r.platform, channel: r.channel, pinned: !!r.pinned,
      deleted: !!r.deleted, ts: r.ts,
    }));
  },

  async deleteChat(id: string) {
    stmts.deleteChat.run(id);
  },

  // INTEGRATIONS ──────────────────────────────────────────────
  async getIntegration<T = any>(key: string): Promise<T | null> {
    const row = stmts.getIntegration.get(key) as { value: string } | undefined;
    if (!row) return null;
    try { return JSON.parse(row.value); } catch { return row.value as any; }
  },

  async setIntegration(key: string, value: any) {
    stmts.setIntegration.run(key, typeof value === 'string' ? value : JSON.stringify(value));
  },
};

// ─── Data Migration: Import existing db.json if present ──────
const migrateFromJson = () => {
  const jsonPath = path.join(__dirname, '..', 'src', 'db.json');
  const altPath = path.join(__dirname, '..', 'db.json');
  const filePath = require('fs').existsSync(jsonPath) ? jsonPath : require('fs').existsSync(altPath) ? altPath : null;

  if (!filePath) return;

  // Only migrate if DB is empty
  const count = (sqlite.prepare('SELECT COUNT(*) as n FROM episodes').get() as any).n;
  if (count > 0) return;

  try {
    const raw = JSON.parse(require('fs').readFileSync(filePath, 'utf-8'));
    const txn = sqlite.transaction(() => {
      for (const ep of raw.episodes || []) {
        db.createEpisode(ep);
      }
      for (const user of raw.users || []) {
        db.createUser({ id: user.id, email: user.email, password: user.password, name: user.name || '', role: user.role || 'admin', permissions: user.permissions || ['all'] });
      }
      for (const [key, value] of Object.entries(raw.settings || {})) {
        db.setSetting(key, value);
      }
    });
    txn();
    console.log(`📦 Migrated data from ${path.basename(filePath)} → studio.db`);
  } catch (err) {
    console.warn('⚠️  db.json migration failed:', err);
  }
};

migrateFromJson();

export default db;
