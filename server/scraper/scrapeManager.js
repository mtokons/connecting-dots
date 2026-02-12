const { getDb } = require('../db/database');
const {
  JamunaTVScraper,
  processScrapedResults,
} = require('./scrapers');
const { broadcastBreaking } = require('../routes/sse');

// একমাত্র তথ্যসূত্র: যমুনা টিভি
const scrapers = [
  new JamunaTVScraper(),
];

/**
 * সকল স্ক্র্যাপার চালান এবং ফলাফল প্রক্রিয়া করুন
 */
async function scrapeAllSources() {
  const db = getDb();
  let totalResults = 0;
  let totalUpdated = 0;
  let totalNew = 0;

  console.log(`🔄 যমুনা টিভি থেকে তথ্য সংগ্রহ করা হচ্ছে...`);

  for (const scraper of scrapers) {
    try {
      console.log(`  📰 স্ক্র্যাপিং: ${scraper.name} (${scraper.url})`);
      const results = await scraper.scrape();

      if (results.length > 0) {
        const { updated, newResults } = processScrapedResults(results);
        totalResults += results.length;
        totalUpdated += updated;
        totalNew += newResults;

        const source = db.prepare('SELECT id FROM scrape_sources WHERE name = ?').get(scraper.name);
        if (source) {
          scraper.logResult(db, source.id, results.length);
        }
        console.log(`    ✅ ${results.length} ফলাফল পাওয়া গেছে (${updated} আপডেট, ${newResults} নতুন)`);
      } else {
        console.log(`    ℹ️  কোনো ফলাফল পাওয়া যায়নি`);
        const source = db.prepare('SELECT id FROM scrape_sources WHERE name = ?').get(scraper.name);
        if (source) {
          scraper.logResult(db, source.id, 0);
        }
      }
    } catch (err) {
      console.error(`    ❌ ত্রুটি: ${err.message}`);
      const source = db.prepare('SELECT id FROM scrape_sources WHERE name = ?').get(scraper.name);
      if (source) {
        scraper.logResult(db, source.id, 0, err.message);
      }
    }
  }

  updateCountingStatus();
  checkForDeclaredSeats();

  console.log(`📊 সারসংক্ষেপ: ${totalResults} ফলাফল, ${totalUpdated} আপডেট, ${totalNew} নতুন`);
  return { totalResults, totalUpdated, totalNew };
}

function updateCountingStatus() {
  const db = getDb();
  db.prepare(`UPDATE results SET status = 'counting' WHERE status = 'waiting' AND votes > 0`).run();

  const counting = db.prepare(`SELECT DISTINCT constituency_id FROM results WHERE status = 'counting'`).all();
  for (const { constituency_id } of counting) {
    const totalVotes = db.prepare(`SELECT SUM(votes) as total FROM results WHERE constituency_id = ?`).get(constituency_id);
    if (totalVotes && totalVotes.total > 0) {
      const candidates = db.prepare(`SELECT id, votes FROM results WHERE constituency_id = ?`).all(constituency_id);
      for (const c of candidates) {
        const pct = ((c.votes / totalVotes.total) * 100).toFixed(2);
        db.prepare('UPDATE results SET vote_percentage = ? WHERE id = ?').run(parseFloat(pct), c.id);
      }
    }
  }
}

function checkForDeclaredSeats() {
  const db = getDb();
  const declared = db.prepare(`
    SELECT co.name as constituency, c.name as winner, p.short_name as party, r.votes
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
      `🏆 ${seat.constituency}: ${seat.winner} (${seat.party}) ${seat.votes.toLocaleString()} ভোটে জয়ী!`
    );
  }
}

module.exports = { scrapeAllSources };
