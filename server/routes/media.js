const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');
const crypto = require('crypto');

// ═══════════════════════════════════════════════════
// POSTS / NEWS ARTICLES
// ═══════════════════════════════════════════════════

// GET all published posts
router.get('/posts', (req, res) => {
  try {
    const db = getDb();
    const { category, featured, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT p.*, 
        (SELECT COUNT(*) FROM comments c WHERE c.content_type = 'post' AND c.content_id = p.id AND c.is_approved = 1) as comment_count
      FROM posts p
      WHERE p.is_published = 1
    `;
    const params = [];

    if (category) {
      query += ' AND p.category = ?';
      params.push(category);
    }
    if (featured === '1') {
      query += ' AND p.is_featured = 1';
    }

    query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const posts = db.prepare(query).all(...params);
    const total = db.prepare('SELECT COUNT(*) as count FROM posts WHERE is_published = 1').get();

    res.json({
      success: true,
      data: posts,
      pagination: { page: parseInt(page), limit: parseInt(limit), total: total.count }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET single post by slug
router.get('/posts/:slug', (req, res) => {
  try {
    const db = getDb();
    const { slug } = req.params;

    const post = db.prepare('SELECT * FROM posts WHERE slug = ? AND is_published = 1').get(slug);
    if (!post) return res.status(404).json({ success: false, error: 'Post not found' });

    // Increment views
    db.prepare('UPDATE posts SET views = views + 1 WHERE id = ?').run(post.id);

    // Get comments
    const comments = db.prepare(`
      SELECT * FROM comments 
      WHERE content_type = 'post' AND content_id = ? AND is_approved = 1
      ORDER BY created_at DESC
    `).all(post.id);

    res.json({ success: true, data: { ...post, comments } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST create new post
router.post('/posts', (req, res) => {
  try {
    const db = getDb();
    const { title, content, excerpt, cover_image, category, tags, author_name, is_featured } = req.body;

    if (!title || !content) {
      return res.status(400).json({ success: false, error: 'Title and content are required' });
    }

    const slug = title.toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 80) + '-' + Date.now().toString(36);

    const result = db.prepare(`
      INSERT INTO posts (title, slug, content, excerpt, cover_image, category, tags, author_name, is_featured)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      title, slug, content,
      excerpt || content.substring(0, 200),
      cover_image || null,
      category || 'news',
      JSON.stringify(tags || []),
      author_name || 'Connecting Dots',
      is_featured ? 1 : 0
    );

    res.json({ success: true, data: { id: result.lastInsertRowid, slug } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET post categories
router.get('/categories', (req, res) => {
  try {
    const db = getDb();
    const categories = db.prepare(`
      SELECT category, COUNT(*) as count 
      FROM posts WHERE is_published = 1 
      GROUP BY category ORDER BY count DESC
    `).all();

    res.json({ success: true, data: categories });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ═══════════════════════════════════════════════════
// PODCASTS
// ═══════════════════════════════════════════════════

// GET all podcasts
router.get('/podcasts', (req, res) => {
  try {
    const db = getDb();
    const { category, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM podcasts WHERE is_published = 1';
    const params = [];

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const podcasts = db.prepare(query).all(...params);
    const total = db.prepare('SELECT COUNT(*) as count FROM podcasts WHERE is_published = 1').get();

    res.json({
      success: true,
      data: podcasts,
      pagination: { page: parseInt(page), limit: parseInt(limit), total: total.count }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET single podcast by slug
router.get('/podcasts/:slug', (req, res) => {
  try {
    const db = getDb();
    const { slug } = req.params;

    const podcast = db.prepare('SELECT * FROM podcasts WHERE slug = ? AND is_published = 1').get(slug);
    if (!podcast) return res.status(404).json({ success: false, error: 'Podcast not found' });

    // Increment views
    db.prepare('UPDATE podcasts SET views = views + 1 WHERE id = ?').run(podcast.id);

    // Get comments
    const comments = db.prepare(`
      SELECT * FROM comments
      WHERE content_type = 'podcast' AND content_id = ? AND is_approved = 1
      ORDER BY created_at DESC
    `).all(podcast.id);

    res.json({ success: true, data: { ...podcast, comments } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST create podcast
router.post('/podcasts', (req, res) => {
  try {
    const db = getDb();
    const { title, description, audio_url, video_url, cover_image, duration, episode_number, season, category, host_name, guest_name } = req.body;

    if (!title) return res.status(400).json({ success: false, error: 'Title is required' });

    const slug = title.toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 80) + '-' + Date.now().toString(36);

    const result = db.prepare(`
      INSERT INTO podcasts (title, slug, description, audio_url, video_url, cover_image, duration, episode_number, season, category, host_name, guest_name)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(title, slug, description, audio_url, video_url, cover_image, duration || 0, episode_number, season || 1, category || 'politics', host_name || 'Connecting Dots', guest_name);

    res.json({ success: true, data: { id: result.lastInsertRowid, slug } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ═══════════════════════════════════════════════════
// LIVE STREAMS
// ═══════════════════════════════════════════════════

// GET all streams
router.get('/streams', (req, res) => {
  try {
    const db = getDb();
    const { status } = req.query;

    let query = 'SELECT * FROM streams';
    const params = [];

    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }

    query += " ORDER BY CASE status WHEN 'live' THEN 0 WHEN 'upcoming' THEN 1 ELSE 2 END, scheduled_at DESC";

    const streams = db.prepare(query).all(...params);
    res.json({ success: true, data: streams });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET single stream
router.get('/streams/:id', (req, res) => {
  try {
    const db = getDb();
    const stream = db.prepare('SELECT * FROM streams WHERE id = ?').get(req.params.id);
    if (!stream) return res.status(404).json({ success: false, error: 'Stream not found' });

    const comments = db.prepare(`
      SELECT * FROM comments
      WHERE content_type = 'stream' AND content_id = ? AND is_approved = 1
      ORDER BY created_at DESC
    `).all(stream.id);

    res.json({ success: true, data: { ...stream, comments } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST create stream
router.post('/streams', (req, res) => {
  try {
    const db = getDb();
    const { title, description, stream_url, embed_url, thumbnail, status, scheduled_at, category } = req.body;

    if (!title) return res.status(400).json({ success: false, error: 'Title is required' });

    const result = db.prepare(`
      INSERT INTO streams (title, description, stream_url, embed_url, thumbnail, status, scheduled_at, category)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(title, description, stream_url, embed_url, thumbnail, status || 'upcoming', scheduled_at, category || 'interview');

    res.json({ success: true, data: { id: result.lastInsertRowid } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ═══════════════════════════════════════════════════
// COMMENTS (anonymous)
// ═══════════════════════════════════════════════════

// GET comments for a content piece
router.get('/comments/:contentType/:contentId', (req, res) => {
  try {
    const db = getDb();
    const { contentType, contentId } = req.params;

    const comments = db.prepare(`
      SELECT * FROM comments
      WHERE content_type = ? AND content_id = ? AND is_approved = 1
      ORDER BY created_at DESC
    `).all(contentType, parseInt(contentId));

    // Build threaded structure
    const rootComments = comments.filter(c => !c.parent_id);
    const replies = comments.filter(c => c.parent_id);

    const threaded = rootComments.map(comment => ({
      ...comment,
      replies: replies.filter(r => r.parent_id === comment.id)
    }));

    res.json({ success: true, data: threaded });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST create comment (anonymous)
router.post('/comments', (req, res) => {
  try {
    const db = getDb();
    const { content_type, content_id, parent_id, display_name, body } = req.body;

    if (!body || !content_type || !content_id) {
      return res.status(400).json({ success: false, error: 'body, content_type, and content_id are required' });
    }

    // Generate a random avatar color
    const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f97316', '#22c55e', '#3b82f6', '#ef4444', '#14b8a6', '#f59e0b', '#06b6d4'];
    const avatar_color = colors[Math.floor(Math.random() * colors.length)];

    // Hash IP for spam detection (don't store raw IP)
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const ip_hash = crypto.createHash('sha256').update(ip + 'cd-salt').digest('hex').substring(0, 16);

    const result = db.prepare(`
      INSERT INTO comments (content_type, content_id, parent_id, display_name, avatar_color, body, ip_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      content_type,
      parseInt(content_id),
      parent_id ? parseInt(parent_id) : null,
      display_name || 'Anonymous',
      avatar_color,
      body,
      ip_hash
    );

    const newComment = db.prepare('SELECT * FROM comments WHERE id = ?').get(result.lastInsertRowid);
    res.json({ success: true, data: newComment });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST like a comment
router.post('/comments/:id/like', (req, res) => {
  try {
    const db = getDb();
    db.prepare('UPDATE comments SET likes = likes + 1 WHERE id = ?').run(req.params.id);
    const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(req.params.id);

    if (!comment) return res.status(404).json({ success: false, error: 'Comment not found' });

    res.json({ success: true, data: comment });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
