const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');

// ─── GET DASHBOARD SUMMARY ─────────────────────────────
router.get('/dashboard', (req, res) => {
  try {
    const db = getDb();

    // Total seats by status
    const seatStatus = db.prepare(`
      SELECT
        status,
        COUNT(DISTINCT constituency_id) as count
      FROM results
      GROUP BY status
    `).all();

    // Party-wise seat count (leading or won)
    const partySeats = db.prepare(`
      WITH leading AS (
        SELECT r.constituency_id, r.candidate_id, r.votes, r.status,
          ROW_NUMBER() OVER (PARTITION BY r.constituency_id ORDER BY r.votes DESC) as rn
        FROM results r
        WHERE r.votes > 0
      )
      SELECT
        p.id, p.name, p.short_name, p.color, p.name_bn,
        COUNT(*) as seats_leading,
        SUM(CASE WHEN l.status = 'declared' THEN 1 ELSE 0 END) as seats_won,
        SUM(l.votes) as total_votes
      FROM leading l
      JOIN candidates c ON c.id = l.candidate_id
      JOIN parties p ON p.id = c.party_id
      WHERE l.rn = 1
      GROUP BY p.id
      ORDER BY seats_leading DESC
    `).all();

    // Total votes cast
    const totalVotes = db.prepare(`
      SELECT SUM(votes) as total FROM results
    `).get();

    // Total constituencies reporting
    const reporting = db.prepare(`
      SELECT COUNT(DISTINCT constituency_id) as count FROM results WHERE centers_reported > 0
    `).get();

    res.json({
      success: true,
      data: {
        seatStatus,
        partySeats,
        totalVotes: totalVotes?.total || 0,
        totalConstituencies: 300,
        reporting: reporting?.count || 0,
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET ALL PARTY RESULTS (for D3 tree) ────────────────
router.get('/parties/tree', (req, res) => {
  try {
    const db = getDb();

    const parties = db.prepare(`
      SELECT p.id, p.name, p.short_name, p.color, p.name_bn, p.leader
      FROM parties p
      ORDER BY p.id
    `).all();

    const treeData = parties.map(party => {
      // Get constituencies where this party is leading
      const leading = db.prepare(`
        WITH leading AS (
          SELECT r.constituency_id, r.candidate_id,
            ROW_NUMBER() OVER (PARTITION BY r.constituency_id ORDER BY r.votes DESC) as rn
          FROM results r
          WHERE r.votes > 0
        )
        SELECT
          c.constituency_id,
          co.name as constituency_name,
          co.division,
          co.district,
          c.name as candidate_name,
          r.votes,
          r.vote_percentage,
          r.status,
          r.centers_reported,
          r.total_centers
        FROM leading l
        JOIN candidates c ON c.id = l.candidate_id
        JOIN results r ON r.candidate_id = c.id AND r.constituency_id = l.constituency_id
        JOIN constituencies co ON co.id = l.constituency_id
        WHERE c.party_id = ? AND l.rn = 1
        ORDER BY r.votes DESC
      `).all(party.id);

      // Group by division
      const divisions = {};
      for (const seat of leading) {
        if (!divisions[seat.division]) {
          divisions[seat.division] = { name: seat.division, seats: [] };
        }
        divisions[seat.division].seats.push(seat);
      }

      return {
        ...party,
        totalSeats: leading.length,
        divisions: Object.values(divisions),
        seats: leading
      };
    });

    // Sort by total seats (most popular first)
    treeData.sort((a, b) => b.totalSeats - a.totalSeats);

    res.json({ success: true, data: treeData });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET CONSTITUENCY DETAILS ───────────────────────────
router.get('/constituency/:id', (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;

    const constituency = db.prepare(`
      SELECT * FROM constituencies WHERE id = ?
    `).get(id);

    if (!constituency) {
      return res.status(404).json({ success: false, error: 'Constituency not found' });
    }

    const results = db.prepare(`
      SELECT
        c.id as candidate_id, c.name as candidate_name, c.symbol,
        p.name as party_name, p.short_name as party_short, p.color as party_color,
        r.votes, r.vote_percentage, r.status, r.centers_reported, r.total_centers,
        r.source, r.updated_at
      FROM candidates c
      JOIN parties p ON p.id = c.party_id
      LEFT JOIN results r ON r.candidate_id = c.id AND r.constituency_id = ?
      WHERE c.constituency_id = ?
      ORDER BY r.votes DESC
    `).all(id, id);

    res.json({ success: true, data: { constituency, results } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET ALL CONSTITUENCIES ─────────────────────────────
router.get('/constituencies', (req, res) => {
  try {
    const db = getDb();
    const { division, status, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      WITH leading AS (
        SELECT r.constituency_id, r.candidate_id,
          ROW_NUMBER() OVER (PARTITION BY r.constituency_id ORDER BY r.votes DESC) as rn
        FROM results r
        WHERE r.votes > 0
      )
      SELECT
        co.id, co.name, co.division, co.district, co.total_voters,
        c.name as leading_candidate, p.short_name as leading_party, p.color as party_color,
        r.votes as leading_votes, r.vote_percentage, r.status,
        r.centers_reported, r.total_centers
      FROM constituencies co
      LEFT JOIN leading l ON l.constituency_id = co.id AND l.rn = 1
      LEFT JOIN results r ON r.constituency_id = l.constituency_id AND r.candidate_id = l.candidate_id
      LEFT JOIN candidates c ON c.id = l.candidate_id
      LEFT JOIN parties p ON p.id = c.party_id
      WHERE 1=1
    `;

    const params = [];
    if (division) {
      query += ' AND co.division = ?';
      params.push(division);
    }
    if (status) {
      query += ' AND r.status = ?';
      params.push(status);
    }

    query += ` ORDER BY co.id LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const constituencies = db.prepare(query).all(...params);

    const total = db.prepare('SELECT COUNT(*) as count FROM constituencies').get();

    res.json({
      success: true,
      data: constituencies,
      pagination: { page: parseInt(page), limit: parseInt(limit), total: total.count }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET PREDICTIONS ────────────────────────────────────
router.get('/predictions', (req, res) => {
  try {
    const db = getDb();

    const predictions = db.prepare(`
      SELECT
        pred.id, pred.predicted_seats, pred.confidence, pred.win_probability,
        pred.model_version, pred.predicted_at,
        p.name as party_name, p.short_name, p.color, p.name_bn
      FROM predictions pred
      JOIN parties p ON p.id = pred.party_id
      ORDER BY pred.predicted_seats DESC
    `).all();

    // Include scenarios and seat ranges from the prediction engine
    const { SCENARIOS, PREDICTED_SEATS } = require('../ai/predictionEngine');

    res.json({ 
      success: true, 
      data: predictions,
      scenarios: SCENARIOS,
      seatRanges: PREDICTED_SEATS,
      electionInfo: {
        votingDate: '2026-02-12T01:30:00.000Z', // 7:30 AM BDT = 1:30 AM UTC
        totalVoters: 127695183,
        totalSeats: 300,
        votingSeats: 299,
        postponedSeats: 1,
        postponedName: 'Sherpur-3',
        registeredParties: 51,
        totalCandidates: 1994,
        independents: 256,
        firstPostalVoting: true,
        noVoteOption: true,
        referendumJulyCharter: true,
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET DIVISION SUMMARY ───────────────────────────────
router.get('/divisions', (req, res) => {
  try {
    const db = getDb();

    const divisions = db.prepare(`
      SELECT
        co.division,
        COUNT(DISTINCT co.id) as total_seats,
        SUM(r.votes) as total_votes
      FROM constituencies co
      LEFT JOIN results r ON r.constituency_id = co.id
      GROUP BY co.division
      ORDER BY total_seats DESC
    `).all();

    // Get leading party per division
    const divisionData = divisions.map(div => {
      const partyBreakdown = db.prepare(`
        WITH leading AS (
          SELECT r.constituency_id, r.candidate_id,
            ROW_NUMBER() OVER (PARTITION BY r.constituency_id ORDER BY r.votes DESC) as rn
          FROM results r
          WHERE r.votes > 0
        )
        SELECT
          p.short_name, p.color, p.name,
          COUNT(*) as seats
        FROM constituencies co
        JOIN leading l ON l.constituency_id = co.id AND l.rn = 1
        JOIN candidates c ON c.id = l.candidate_id
        JOIN parties p ON p.id = c.party_id
        WHERE co.division = ?
        GROUP BY p.id
        ORDER BY seats DESC
      `).all(div.division);

      return { ...div, parties: partyBreakdown };
    });

    res.json({ success: true, data: divisionData });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET NEWS TICKER ────────────────────────────────────
router.get('/news', async (req, res) => {
  try {
    const db = getDb();

    // First try to get news from database
    let news = [];
    try {
      news = db.prepare(`SELECT * FROM news_ticker ORDER BY created_at DESC LIMIT 20`).all();
    } catch (e) { /* table may not exist yet */ }

    // If no news in DB, try live scrape from onefiftyonebd.com
    if (news.length === 0) {
      try {
        const { OneFiftyOneBDScraper } = require('../scraper/scrapers');
        const scraper = new OneFiftyOneBDScraper();
        const liveNews = await scraper.scrapeNewsTicker();

        // Store in database for caching
        if (liveNews.length > 0) {
          const insert = db.prepare(`INSERT OR IGNORE INTO news_ticker (title, url, source) VALUES (?, ?, ?)`);
          const insertAll = db.transaction(() => {
            for (const n of liveNews) {
              insert.run(n.title, n.url, n.source);
            }
          });
          insertAll();
          news = liveNews.map((n, i) => ({ id: i + 1, ...n, created_at: n.timestamp }));
        }
      } catch (scrapeErr) {
        console.error('News scrape error:', scrapeErr.message);
      }
    }

    // If still no news, return curated fallback
    if (news.length === 0) {
      news = [
        { id: 1, title: 'Violence, vote manipulation allegations surface on eve of polls', url: 'https://www.thedailystar.net/election-2026', source: 'The Daily Star', is_breaking: 1 },
        { id: 2, title: 'Ballot stuffing allegations spark clash between Sylhet-3 Jamaat and BNP activists', url: 'https://www.thedailystar.net/election-2026', source: 'The Daily Star', is_breaking: 1 },
        { id: 3, title: '330 untrained Ansar-VDP members removed from election duty', url: 'https://www.thedailystar.net/election-2026', source: 'The Daily Star', is_breaking: 0 },
        { id: 4, title: 'Free, fair election key to Bangladesh\'s democratic future: EU observer mission chief', url: 'https://www.thedailystar.net/election-2026', source: 'The Daily Star', is_breaking: 0 },
        { id: 5, title: 'Election Commission warns against smartphone use inside polling booths', url: 'https://www.thedailystar.net/election-2026', source: 'The Daily Star', is_breaking: 0 },
        { id: 6, title: '12.77 crore voters to elect 13th Jatiya Sangsad today', url: 'https://www.thedailystar.net/election-2026', source: 'The Daily Star', is_breaking: 0 },
        { id: 7, title: 'Army deployment complete at all 300 constituencies', url: 'https://www.thedailystar.net/election-2026', source: 'The Daily Star', is_breaking: 0 },
        { id: 8, title: 'Record number of women candidates contesting this election', url: 'https://www.thedailystar.net/election-2026', source: 'The Daily Star', is_breaking: 0 },
        { id: 9, title: 'First-ever postal voting system debuts in Bangladesh election', url: 'https://www.thedailystar.net/election-2026', source: 'The Daily Star', is_breaking: 0 },
        { id: 10, title: 'NCP emerges as dark horse in several Dhaka constituencies', url: 'https://www.thedailystar.net/election-2026', source: 'The Daily Star', is_breaking: 0 },
        { id: 11, title: 'Voter turnout expected to exceed 75% according to EC estimates', url: 'https://www.thedailystar.net/election-2026', source: 'The Daily Star', is_breaking: 0 },
        { id: 12, title: 'International observers praise transparent EVM deployment', url: 'https://www.thedailystar.net/election-2026', source: 'The Daily Star', is_breaking: 0 },
      ];
    }

    res.json({ success: true, data: news });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET SCRAPE STATUS ──────────────────────────────────
router.get('/scrape/status', (req, res) => {
  try {
    const db = getDb();

    const sources = db.prepare(`
      SELECT s.*, 
        (SELECT COUNT(*) FROM scrape_log sl WHERE sl.source_id = s.id) as total_scrapes,
        (SELECT sl.scraped_at FROM scrape_log sl WHERE sl.source_id = s.id ORDER BY sl.scraped_at DESC LIMIT 1) as last_scrape_time
      FROM scrape_sources s
      ORDER BY s.name
    `).all();

    res.json({ success: true, data: sources });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── SEARCH ─────────────────────────────────────────────
router.get('/search', (req, res) => {
  try {
    const db = getDb();
    const { q } = req.query;

    if (!q || q.length < 2) {
      return res.json({ success: true, data: [] });
    }

    const results = db.prepare(`
      SELECT co.id, co.name, co.division, co.district,
        c.name as candidate_name, p.short_name as party
      FROM constituencies co
      LEFT JOIN candidates c ON c.constituency_id = co.id
      LEFT JOIN parties p ON p.id = c.party_id
      WHERE co.name LIKE ? OR co.district LIKE ? OR c.name LIKE ? OR p.name LIKE ?
      LIMIT 20
    `).all(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);

    res.json({ success: true, data: results });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
