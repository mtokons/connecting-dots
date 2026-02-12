const { getDb } = require('../db/database');
const {
  ElectionResultsBDScraper,
  UNBElectionScraper,
  ElectionResult2026Scraper,
  ECSScraper,
  DailyStarScraper,
  ProthomAloScraper,
  BdNews24Scraper,
  VoteBDScraper,
  OneFiftyOneBDScraper,
  ElectionWatchBDScraper,
  ProthomAloEnglishLiveScraper,
  processScrapedResults,
} = require('./scrapers');
const { broadcastBreaking } = require('../routes/sse');

// All active scrapers — priority order (primary → secondary)
const scrapers = [
  new ProthomAloEnglishLiveScraper(), // en.prothomalo.com LIVE blog (confirmed results)
  new ElectionWatchBDScraper(),      // electionwatchbd.com (real-time results)
  new ElectionResultsBDScraper(),   // election.results.com.bd
  new UNBElectionScraper(),         // election.unb.com.bd
  new ElectionResult2026Scraper(),  // electionresult2026bd.com
  new ECSScraper(),                 // ecs.gov.bd (official)
  new DailyStarScraper(),           // thedailystar.net
  new ProthomAloScraper(),          // prothomalo.com
  new BdNews24Scraper(),            // bdnews24.com
  new VoteBDScraper(),              // votebd.org (SHUJAN)
  new OneFiftyOneBDScraper(),       // onefiftyonebd.com (projections + ticker)
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
      console.log(`  📰 Scraping: ${scraper.name} (${scraper.url})`);
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

  // Update counting status based on real scraped data
  updateCountingStatus();
  checkForDeclaredSeats();

  console.log(`📊 Scrape summary: ${totalResults} results, ${totalUpdated} updated, ${totalNew} new`);
  return { totalResults, totalUpdated, totalNew };
}

/**
 * Update vote counting status based on real scraped data
 * Marks constituencies as 'counting' when they receive first votes,
 * and 'declared' when marked so by source data
 */
function updateCountingStatus() {
  const db = getDb();

  // Mark constituencies with votes > 0 as 'counting' (if still 'waiting')
  db.prepare(`
    UPDATE results SET status = 'counting'
    WHERE status = 'waiting'
    AND votes > 0
  `).run();

  // Update vote percentages for constituencies being counted
  const counting = db.prepare(`
    SELECT DISTINCT constituency_id FROM results
    WHERE status = 'counting'
  `).all();

  for (const { constituency_id } of counting) {
    const totalVotes = db.prepare(`
      SELECT SUM(votes) as total FROM results WHERE constituency_id = ?
    `).get(constituency_id);

    if (totalVotes && totalVotes.total > 0) {
      const candidates = db.prepare(`SELECT id, votes FROM results WHERE constituency_id = ?`).all(constituency_id);
      for (const c of candidates) {
        const pct = ((c.votes / totalVotes.total) * 100).toFixed(2);
        db.prepare('UPDATE results SET vote_percentage = ? WHERE id = ?').run(parseFloat(pct), c.id);
      }
    }
  }
}

/**
 * Check for newly declared seats and broadcast breaking news
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
      ORDER BY r2.votes DESC LIMIT 1
    )
    ORDER BY r.updated_at DESC LIMIT 5
  `).all();

  for (const seat of declared) {
    broadcastBreaking(
      `🏆 ${seat.constituency}: ${seat.winner} (${seat.party}) wins with ${seat.votes.toLocaleString()} votes!`
    );
  }
}

module.exports = { scrapeAllSources };
