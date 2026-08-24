import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db';
import { requireHostKey } from '../middleware/auth';
import { rateLimit } from '../middleware/rateLimit';

const router = Router();

// Public read
router.get('/', rateLimit({ windowMs: 10_000, max: 60 }), async (_req, res) => {
  try {
    const episodes = await db.listEpisodes();
    res.json(episodes);
  } catch (err) {
    console.error('Failed to fetch episodes:', err);
    res.status(500).json({ error: 'Failed to fetch episodes' });
  }
});

// Get single episode by ID (public — used by guest join)
router.get('/:id', rateLimit({ windowMs: 10_000, max: 60 }), async (req, res) => {
  try {
    const episodes = await db.listEpisodes();
    const episode = episodes.find((ep: any) => ep.id === req.params.id);
    if (!episode) {
      res.status(404).json({ error: 'Episode not found' });
      return;
    }
    res.json(episode);
  } catch {
    res.status(500).json({ error: 'Failed to fetch episode' });
  }
});

// Host-protected writes
router.post('/', requireHostKey, async (req, res) => {
  try {
    const { title, host, guest, description, imageUrl, status, date, time, tags } = req.body;

    // Auto-generate a roomId for the episode studio
    const roomId = `ep-${uuidv4().slice(0, 8)}`;

    const newEpisode = {
      id: uuidv4(),
      title,
      host,
      guest: guest || '',
      description,
      imageUrl:
        imageUrl ||
        'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?q=80&w=1200&auto=format&fit=crop',
      status: status || 'upcoming',
      date: date || new Date().toISOString().split('T')[0],
      time: time || '',
      tags: tags || [],
      roomId,
    };
    await db.createEpisode(newEpisode);
    res.status(201).json(newEpisode);
  } catch (err) {
    console.error('Failed to create episode:', err);
    res.status(500).json({ error: 'Failed to create episode' });
  }
});

router.put('/:id', requireHostKey, async (req, res) => {
  try {
    const updated = await db.updateEpisode(String(req.params.id), req.body);
    if (!updated) {
      res.status(404).json({ error: 'Episode not found' });
      return;
    }
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Failed to update episode' });
  }
});

router.delete('/:id', requireHostKey, async (req, res) => {
  try {
    await db.deleteEpisode(String(req.params.id));
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Failed to delete episode' });
  }
});

// Update episode status by roomId (used by Studio when going live/offline)
router.patch('/by-room/:roomId', requireHostKey, async (req, res) => {
  try {
    const { status } = req.body;
    if (!status || !['upcoming', 'live', 'recorded'].includes(status)) {
      res.status(400).json({ error: 'Invalid status' });
      return;
    }
    const episodes = await db.listEpisodes();
    const episode = episodes.find((ep: any) => ep.roomId === req.params.roomId);
    if (!episode) {
      res.status(404).json({ error: 'Episode not found for this room' });
      return;
    }
    const updated = await db.updateEpisode(episode.id, { status });
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Failed to update episode status' });
  }
});

export default router;
