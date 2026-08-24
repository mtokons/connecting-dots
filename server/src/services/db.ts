/**
 * Persistence abstraction.
 *
 * Default backend: local JSON file (`server/src/db.json`) — zero setup.
 * If `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` are set, the same
 * collections are mirrored to / read from Supabase via the REST API
 * (no SDK required). This lets you migrate to the cloud free tier
 * without touching call-sites.
 *
 * Required Supabase tables (create once in the dashboard):
 *   episodes        (id text primary key, payload jsonb, created_at timestamptz default now())
 *   settings        (key text primary key, value jsonb)
 *   chat_messages   (id text primary key, room_id text, payload jsonb, created_at timestamptz default now())
 *   integrations    (key text primary key, value jsonb)
 */

import fs from 'fs';
import path from 'path';
import * as admin from 'firebase-admin';

// Anchor the JSON store at <projectRoot>/src/db.json regardless of whether
// we're running via tsx (src/) or compiled JS (dist/). This keeps a single
// source of truth across dev and prod builds.
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const SRC_DB = path.join(PROJECT_ROOT, 'src', 'db.json');
const ROOT_DB = path.join(PROJECT_ROOT, 'db.json');
const DB_PATH = fs.existsSync(SRC_DB) ? SRC_DB : ROOT_DB;

type DbShape = {
  episodes: any[];
  settings: Record<string, any>;
  chat_messages: any[];
  integrations: Record<string, any>;
  users: any[];
};

const ensureFile = () => {
  if (!fs.existsSync(DB_PATH)) {
    const seed: DbShape = { episodes: [], settings: {}, chat_messages: [], integrations: {}, users: [] };
    fs.writeFileSync(DB_PATH, JSON.stringify(seed, null, 2));
  } else {
    try {
      const raw = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8')) as Partial<DbShape>;
      let mutated = false;
      if (!raw.chat_messages) {
        raw.chat_messages = [];
        mutated = true;
      }
      if (!raw.users) {
        raw.users = [];
        mutated = true;
      }
      if (mutated) fs.writeFileSync(DB_PATH, JSON.stringify(raw, null, 2));
    } catch {
      /* corrupt file — leave for caller to surface */
    }
  }
};

const readLocal = (): DbShape => {
  ensureFile();
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8')) as DbShape;
};

const writeLocal = (data: DbShape) => {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
};

// Firestore Detection
const firestoreEnabled = () => {
  try {
    return admin.apps.length > 0;
  } catch {
    return false;
  }
};

const getFirestore = () => admin.firestore();

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────

export const db = {
  isCloud: () => firestoreEnabled(),

  // EPISODES ---------------------------------------------------
  async listEpisodes(): Promise<any[]> {
    if (firestoreEnabled()) {
      const snapshot = await getFirestore().collection('episodes').orderBy('date', 'desc').get();
      return snapshot.docs.map(doc => doc.data());
    }
    return readLocal().episodes;
  },

  async createEpisode(episode: any): Promise<any> {
    if (firestoreEnabled()) {
      await getFirestore().collection('episodes').doc(episode.id).set(episode);
      return episode;
    }
    const data = readLocal();
    data.episodes.push(episode);
    writeLocal(data);
    return episode;
  },

  async updateEpisode(id: string, updates: any): Promise<any | null> {
    if (firestoreEnabled()) {
      const docRef = getFirestore().collection('episodes').doc(id);
      const doc = await docRef.get();
      if (!doc.exists) return null;
      const merged = { ...doc.data(), ...updates };
      await docRef.update(updates);
      return merged;
    }
    const data = readLocal();
    const idx = data.episodes.findIndex((ep: any) => ep.id === id);
    if (idx === -1) return null;
    data.episodes[idx] = { ...data.episodes[idx], ...updates };
    writeLocal(data);
    return data.episodes[idx];
  },

  async deleteEpisode(id: string): Promise<void> {
    if (firestoreEnabled()) {
      await getFirestore().collection('episodes').doc(id).delete();
      return;
    }
    const data = readLocal();
    data.episodes = data.episodes.filter((ep: any) => ep.id !== id);
    writeLocal(data);
  },

  // SETTINGS / INTEGRATIONS -----------------------------------
  async getSetting<T = any>(key: string): Promise<T | null> {
    if (firestoreEnabled()) {
      const doc = await getFirestore().collection('settings').doc(key).get();
      return (doc.data()?.value as T) ?? null;
    }
    return (readLocal().settings[key] as T) ?? null;
  },

  async setSetting(key: string, value: any): Promise<void> {
    if (firestoreEnabled()) {
      await getFirestore().collection('settings').doc(key).set({ value }, { merge: true });
      return;
    }
    const data = readLocal();
    data.settings[key] = value;
    writeLocal(data);
  },

  async getIntegration<T = any>(key: string): Promise<T | null> {
    if (firestoreEnabled()) {
      const doc = await getFirestore().collection('integrations').doc(key).get();
      return (doc.data()?.value as T) ?? null;
    }
    return (readLocal().integrations[key] as T) ?? null;
  },

  async setIntegration(key: string, value: any): Promise<void> {
    if (firestoreEnabled()) {
      await getFirestore().collection('integrations').doc(key).set({ value }, { merge: true });
      return;
    }
    const data = readLocal();
    data.integrations[key] = value;
    writeLocal(data);
  },

  // CHAT MESSAGES ---------------------------------------------
  async appendChat(message: any): Promise<void> {
    if (firestoreEnabled()) {
      await getFirestore().collection('chat_messages').doc(message.id).set({
        ...message,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return;
    }
    const data = readLocal();
    data.chat_messages.push(message);
    if (data.chat_messages.length > 5000) {
      data.chat_messages = data.chat_messages.slice(-5000);
    }
    writeLocal(data);
  },

  async listChat(roomId: string, limit = 200): Promise<any[]> {
    if (firestoreEnabled()) {
      const snapshot = await getFirestore()
        .collection('chat_messages')
        .where('roomId', '==', roomId)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();
      return snapshot.docs.map(doc => doc.data()).reverse();
    }
    return readLocal()
      .chat_messages.filter((m: any) => m.roomId === roomId)
      .slice(-limit);
  },

  async deleteChat(id: string): Promise<void> {
    if (firestoreEnabled()) {
      await getFirestore().collection('chat_messages').doc(id).delete();
      return;
    }
    const data = readLocal();
    data.chat_messages = data.chat_messages.filter((m: any) => m.id !== id);
    writeLocal(data);
  },

  // USERS -----------------------------------------------------
  async findUserByEmail(email: string): Promise<any | null> {
    if (firestoreEnabled()) {
      const snapshot = await getFirestore().collection('users').where('email', '==', email).limit(1).get();
      if (snapshot.empty) return null;
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() };
    }
    return readLocal().users.find((u: any) => u.email === email) ?? null;
  },

  async createUser(user: any): Promise<void> {
    if (firestoreEnabled()) {
      await getFirestore().collection('users').doc(user.id || user.email).set(user);
      return;
    }
    const data = readLocal();
    data.users.push(user);
    writeLocal(data);
  },

  async updateUser(id: string, fields: Record<string, any>): Promise<void> {
    if (firestoreEnabled()) {
      // Try doc by id first, fall back to querying by email
      const col = getFirestore().collection('users');
      const doc = col.doc(id);
      const snap = await doc.get();
      if (snap.exists) {
        await doc.update(fields);
      } else {
        // id might be 'admin-id' but doc stored under email
        const qs = await col.where('email', '==', (fields as any).email ?? id).limit(1).get();
        if (!qs.empty) await qs.docs[0].ref.update(fields);
      }
      return;
    }
    const data = readLocal();
    const idx = data.users.findIndex((u: any) => u.id === id || u.email === id);
    if (idx !== -1) {
      data.users[idx] = { ...data.users[idx], ...fields };
      writeLocal(data);
    }
  },
};
