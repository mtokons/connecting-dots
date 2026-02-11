const { getDb } = require('../db/database');
const {
  ECSScraper,
  DailyStarScraper,
  ProthomAloScraper,
  BdNews24Scraper,
  processScrapedResults,
} = require('./scrapers');
const { broadcastBreaking } = require('../routes/sse');

// All active scrapers
const scrapers = [
  new ECSScraper(),
  new DailyStarScraper(),
  new ProthomAloScraper(),
  new BdNews24Scraper(),
];

/**
 * Run all scrapers and process results
 */
async function scrapeAllSources() {
  const db = getDb();
  let totalResults = 0;
  let totalUpdated = 0;
  let totalNew = 0;

  console.log(`🔄 Running ${scrapers.length} scrapers...`);

  for (const scraper of scrapers) {
    try {
      console.log(`  📰 Scraping: ${scraper.name}`);
      const results = await scraper.scrape();
      
      if (results.length > 0) {
        const { updated, newResults } = processScrapedResults(results);
        totalResults += results.length;
        totalUpdated += updated;
        totalNew += newResults;

        // Log to database
        const source = db.prepare('SELECT id FROM scrape_sources WHERE name = ?').get(scraper.name);
        if (source) {
          scraper.logResult(db, source.id, results.length);
        }

        console.log(`    ✅ Found ${results.length} results (${updated} updated, ${newResults} new)`);
      } else {
        console.log(`    ℹ️  No results found`);
        const source = db.prepare('SELECT id FROM scrape_sources WHERE name = ?').get(scraper.name);
        if (source) {
          scraper.logResult(db, source.id, 0);
        }
      }
    } catch (err) {
      console.error(`    ❌ Error: ${err.message}`);
      const source = db.prepare('SELECT id FROM scrape_sources WHERE name = ?').get(scraper.name);
      if (source) {
        scraper.logResult(db, source.id, 0, err.message);
      }
    }
  }

  // Simulate live updates for demo (updates random constituencies)
  simulateLiveUpdates();

  // Check for any seat that just got declared
  checkForDeclaredSeats();

  console.log(`📊 Scrape summary: ${totalResults} results, ${totalUpdated} updated, ${totalNew} new`);
  return { totalResults, totalUpdated, totalNew };
}

/**
 * Simulate live vote updates for demo purposes
 * In production, this would be replaced by real scraper data
 */
function simulateLiveUpdates() {
  const db = getDb();

  // Pick 10 random constituencies and update vote counts
  const constituencies = db.prepare(`
    SELECT DISTINCT constituency_id FROM results
    WHERE status = 'counting'
    ORDER BY RANDOM()
    LIMIT 10
  `).all();

  for (const { constituency_id } of constituencies) {
    const candidates = db.prepare(`
      SELECT id, votes FROM results WHERE constituency_id = ?
    `).all(constituency_id);

    let totalVotes = 0;
    for (const c of candidates) {
      const increment = Math.floor(Math.random() * 2000);
      const newVotes = c.votes + increment;
      totalVotes += newVotes;
      db.prepare('UPDATE results SET votes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(newVotes, c.id);
    }

    // Update percentages
    for (const c of candidates) {
      const updated = db.prepare('SELECT votes FROM results WHERE id = ?').get(c.id);
      const pct = ((updated.votes / totalVotes) * 100).toFixed(2);
      db.prepare('UPDATE results SET vote_percentage = ? WHERE id = ?').run(parseFloat(pct), c.id);
    }

    // Update centers reported
    const result = db.prepare('SELECT centers_reported, total_centers FROM results WHERE constituency_id = ? LIMIT 1')
      .get(constituency_id);
    if (result && result.centers_reported < result.total_centers) {
      const newCenters = Math.min(result.centers_reported + 1, result.total_centers);
      db.prepare('UPDATE results SET centers_reported = ? WHERE constituency_id = ?')
        .run(newCenters, constituency_id);

      // If all centers reported, mark as declared
      if (newCenters >= result.total_centers) {
        db.prepare("UPDATE results SET status = 'declared' WHERE constituency_id = ?")
          .run(constituency_id);
      }
    }
  }
}

/**
 * Check for newly declared seats and broadcast
 */
function checkForDeclaredSeats() {
  const db = getDb();

  const declared = db.prepare(`
    SELECT 
      co.name as constituency, c.name as winner, p.short_name as party, r.votes
    FROM results r
    JOIN candidates c ON c.id = r.candidate_id
    JOIN constituencies co ON co.id = r.constituency_id
    JOIN parties p ON p.id = c.party_id
    WHERE r.status = 'declared'
    AND r.updated_at > datetime('now', '-5 minutes')
    AND r.candidate_id IN (
      SELECT r2.candidate_id FROM results r2
      WHERE r2.constituency_id = r.constituency_id
      ORDER BY r2.votes DESC
      LIMIT 1
    )
    ORDER BY r.updated_at DESC
    LIMIT 5
  `).all();

  for (const seat of declared) {
    broadcastBreaking(
      `🏆 ${seat.constituency}: ${seat.winner} (${seat.party}) wins with ${seat.votes.toLocaleString()} votes!`
    );
  }
}

module.exports = { scrapeAllSources };
