const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'election.db');
let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

function initialize() {
  const database = getDb();

  database.exec(`
    -- Political Parties
    CREATE TABLE IF NOT EXISTS parties (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      name_bn TEXT,
      short_name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#888888',
      logo_url TEXT,
      leader TEXT,
      founded INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Constituencies (300 seats)
    CREATE TABLE IF NOT EXISTS constituencies (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      name_bn TEXT,
      division TEXT NOT NULL,
      district TEXT NOT NULL,
      total_voters INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Candidates
    CREATE TABLE IF NOT EXISTS candidates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      name_bn TEXT,
      party_id INTEGER,
      constituency_id INTEGER NOT NULL,
      symbol TEXT,
      photo_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (party_id) REFERENCES parties(id),
      FOREIGN KEY (constituency_id) REFERENCES constituencies(id)
    );

    -- Live Results
    CREATE TABLE IF NOT EXISTS results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      constituency_id INTEGER NOT NULL,
      candidate_id INTEGER NOT NULL,
      votes INTEGER DEFAULT 0,
      vote_percentage REAL DEFAULT 0,
      status TEXT DEFAULT 'counting',
      centers_reported INTEGER DEFAULT 0,
      total_centers INTEGER DEFAULT 0,
      source TEXT,
      source_url TEXT,
      is_verified INTEGER DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(constituency_id, candidate_id),
      FOREIGN KEY (constituency_id) REFERENCES constituencies(id),
      FOREIGN KEY (candidate_id) REFERENCES candidates(id)
    );

    -- AI Predictions
    CREATE TABLE IF NOT EXISTS predictions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      party_id INTEGER NOT NULL,
      predicted_seats INTEGER DEFAULT 0,
      confidence REAL DEFAULT 0,
      win_probability REAL DEFAULT 0,
      model_version TEXT DEFAULT 'v1',
      predicted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (party_id) REFERENCES parties(id)
    );

    -- Scrape Sources
    CREATE TABLE IF NOT EXISTS scrape_sources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      type TEXT DEFAULT 'website',
      is_active INTEGER DEFAULT 1,
      last_scraped DATETIME,
      scrape_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Scrape Log
    CREATE TABLE IF NOT EXISTS scrape_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_id INTEGER,
      status TEXT DEFAULT 'success',
      records_found INTEGER DEFAULT 0,
      error_message TEXT,
      scraped_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (source_id) REFERENCES scrape_sources(id)
    );

    -- নিউজ টিকার (যমুনা টিভি থেকে লাইভ শিরোনাম)
    CREATE TABLE IF NOT EXISTS news_ticker (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      url TEXT,
      source TEXT DEFAULT 'যমুনা টিভি',
      category TEXT DEFAULT 'election',
      is_breaking INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- ═══════════════════════════════════════════════════
    -- MEDIA PORTAL TABLES (News, Podcasts, Comments)
    -- ═══════════════════════════════════════════════════

    -- News / Blog Posts
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      slug TEXT UNIQUE,
      content TEXT NOT NULL,
      excerpt TEXT,
      cover_image TEXT,
      category TEXT DEFAULT 'news',
      tags TEXT DEFAULT '[]',
      author_name TEXT DEFAULT 'Connecting Dots',
      is_featured INTEGER DEFAULT 0,
      is_published INTEGER DEFAULT 1,
      views INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Podcasts / Episodes
    CREATE TABLE IF NOT EXISTS podcasts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      slug TEXT UNIQUE,
      description TEXT,
      audio_url TEXT,
      video_url TEXT,
      cover_image TEXT,
      duration INTEGER DEFAULT 0,
      episode_number INTEGER,
      season INTEGER DEFAULT 1,
      category TEXT DEFAULT 'politics',
      host_name TEXT DEFAULT 'Connecting Dots',
      guest_name TEXT,
      is_live INTEGER DEFAULT 0,
      is_published INTEGER DEFAULT 1,
      views INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Live Streams
    CREATE TABLE IF NOT EXISTS streams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      stream_url TEXT,
      embed_url TEXT,
      thumbnail TEXT,
      status TEXT DEFAULT 'upcoming',
      scheduled_at DATETIME,
      started_at DATETIME,
      ended_at DATETIME,
      viewers INTEGER DEFAULT 0,
      category TEXT DEFAULT 'interview',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Comments (anonymous supported)
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content_type TEXT NOT NULL DEFAULT 'post',
      content_id INTEGER NOT NULL,
      parent_id INTEGER DEFAULT NULL,
      display_name TEXT DEFAULT 'Anonymous',
      avatar_color TEXT DEFAULT '#6366f1',
      body TEXT NOT NULL,
      likes INTEGER DEFAULT 0,
      is_approved INTEGER DEFAULT 1,
      ip_hash TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (parent_id) REFERENCES comments(id)
    );

    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_results_constituency ON results(constituency_id);
    CREATE INDEX IF NOT EXISTS idx_results_candidate ON results(candidate_id);
    CREATE INDEX IF NOT EXISTS idx_candidates_party ON candidates(party_id);
    CREATE INDEX IF NOT EXISTS idx_candidates_constituency ON candidates(constituency_id);
    CREATE INDEX IF NOT EXISTS idx_predictions_party ON predictions(party_id);
    CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug);
    CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category);
    CREATE INDEX IF NOT EXISTS idx_podcasts_slug ON podcasts(slug);
    CREATE INDEX IF NOT EXISTS idx_comments_content ON comments(content_type, content_id);
    CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id);
    CREATE INDEX IF NOT EXISTS idx_streams_status ON streams(status);
  `);

  console.log('✅ Database initialized');
  return database;
}

module.exports = { getDb, initialize };
