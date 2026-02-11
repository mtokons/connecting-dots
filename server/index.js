require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const cron = require('node-cron');

const db = require('./db/database');
const apiRoutes = require('./routes/api');
const sseRoutes = require('./routes/sse');
const { scrapeAllSources } = require('./scraper/scrapeManager');
const { runPrediction } = require('./ai/predictionEngine');
const { seedData } = require('./scripts/seedData');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(compression());
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api', apiRoutes);
app.use('/sse', sseRoutes);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
  app.get('*', (req, res, next) => {
    // Skip API and SSE routes
    if (req.path.startsWith('/api') || req.path.startsWith('/sse')) {
      return next();
    }
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

// Initialize database
db.initialize();

// Check if DB needs seeding (for production first run)
const database = db.getDb();
const partyCount = database.prepare('SELECT COUNT(*) as count FROM parties').get();
if (partyCount.count === 0) {
  console.log('📦 Empty database detected, seeding...');
  seedData();
}

// Schedule scraping every N minutes
const scrapeInterval = process.env.SCRAPE_INTERVAL || 5;
cron.schedule(`*/${scrapeInterval} * * * *`, async () => {
  console.log('🔄 Running scheduled scrape...');
  try {
    await scrapeAllSources();
    await runPrediction();
    console.log('✅ Scrape & prediction complete');
  } catch (err) {
    console.error('❌ Scrape error:', err.message);
  }
});

// Initial scrape on startup
setTimeout(async () => {
  console.log('🚀 Running initial data load...');
  try {
    await scrapeAllSources();
    await runPrediction();
  } catch (err) {
    console.error('❌ Initial scrape error:', err.message);
  }
}, 2000);

app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════════╗
  ║   🗳️  CONNECTING DOTS - BD Election 2026    ║
  ║   Server running on port ${PORT}              ║
  ║   Dashboard: http://localhost:${PORT}          ║
  ╚══════════════════════════════════════════════╝
  `);
});

module.exports = app;
