const axios = require('axios');
const cheerio = require('cheerio');
const { getDb } = require('../db/database');
const { broadcastResultUpdate, broadcastBreaking } = require('../routes/sse');

/**
 * Web Scraper for Bangladesh Election Results
 * Scrapes data from multiple Bangladeshi news portals
 * 
 * NOTE: These scrapers use CSS selectors that may need updating
 * based on actual website structure. The framework is ready
 * to plug in real selectors once the election pages go live.
 */

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// ─── BASE SCRAPER ─────────────────────────────────────────
class BaseScraper {
  constructor(name, url) {
    this.name = name;
    this.url = url;
    this.results = [];
  }

  async fetch(url) {
    try {
      const response = await axios.get(url || this.url, {
        headers: {
          'User-Agent': USER_AGENT,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5,bn;q=0.3',
        },
        timeout: 15000,
      });
      return cheerio.load(response.data);
    } catch (err) {
      console.error(`❌ Scrape failed for ${this.name}: ${err.message}`);
      return null;
    }
  }

  async scrape() {
    throw new Error('scrape() must be implemented');
  }

  logResult(db, sourceId, count, error = null) {
    db.prepare(`
      INSERT INTO scrape_log (source_id, status, records_found, error_message)
      VALUES (?, ?, ?, ?)
    `).run(sourceId, error ? 'error' : 'success', count, error);

    db.prepare(`
      UPDATE scrape_sources SET last_scraped = CURRENT_TIMESTAMP, scrape_count = scrape_count + 1
      WHERE id = ?
    `).run(sourceId);
  }
}

// ─── ELECTION COMMISSION SCRAPER ──────────────────────────
class ECSScraper extends BaseScraper {
  constructor() {
    super('Bangladesh Election Commission', 'https://www.ecs.gov.bd');
  }

  async scrape() {
    const $ = await this.fetch();
    if (!$) return [];

    const results = [];

    // Target election results page - selectors to be updated
    // when official results page structure is known
    $('table.result-table tr, .election-result-row').each((i, el) => {
      try {
        const constituency = $(el).find('.constituency-name, td:nth-child(1)').text().trim();
        const candidate = $(el).find('.candidate-name, td:nth-child(2)').text().trim();
        const party = $(el).find('.party-name, td:nth-child(3)').text().trim();
        const votes = parseInt($(el).find('.votes, td:nth-child(4)').text().replace(/,/g, '')) || 0;

        if (constituency && candidate && votes > 0) {
          results.push({ constituency, candidate, party, votes, source: this.name });
        }
      } catch (e) { /* skip malformed rows */ }
    });

    return results;
  }
}

// ─── DAILY STAR SCRAPER ──────────────────────────────────
class DailyStarScraper extends BaseScraper {
  constructor() {
    super('The Daily Star', 'https://www.thedailystar.net/election');
  }

  async scrape() {
    const $ = await this.fetch();
    if (!$) return [];

    const results = [];

    // The Daily Star election result cards
    $('.election-card, .result-card, .seat-result').each((i, el) => {
      try {
        const constituency = $(el).find('.seat-name, .constituency, h3').text().trim();
        const candidate = $(el).find('.winner-name, .candidate-name').text().trim();
        const party = $(el).find('.party, .party-name').text().trim();
        const votesText = $(el).find('.votes, .vote-count').text().replace(/,/g, '');
        const votes = parseInt(votesText) || 0;

        if (constituency && candidate) {
          results.push({ constituency, candidate, party, votes, source: this.name });
        }
      } catch (e) { /* skip */ }
    });

    return results;
  }
}

// ─── PROTHOM ALO SCRAPER ─────────────────────────────────
class ProthomAloScraper extends BaseScraper {
  constructor() {
    super('Prothom Alo', 'https://www.prothomalo.com/election');
  }

  async scrape() {
    const $ = await this.fetch();
    if (!$) return [];

    const results = [];

    $('.election-result, .nirbachon-result, .seat-card').each((i, el) => {
      try {
        const constituency = $(el).find('.ason-name, .seat-title').text().trim();
        const candidate = $(el).find('.prarthi-name, .candidate').text().trim();
        const party = $(el).find('.dol-name, .party').text().trim();
        const votes = parseInt($(el).find('.vote-sonkhya, .votes').text().replace(/,/g, '')) || 0;

        if (constituency && candidate) {
          results.push({ constituency, candidate, party, votes, source: this.name });
        }
      } catch (e) { /* skip */ }
    });

    return results;
  }
}

// ─── BDNEWS24 SCRAPER ────────────────────────────────────
class BdNews24Scraper extends BaseScraper {
  constructor() {
    super('bdnews24', 'https://bdnews24.com/election');
  }

  async scrape() {
    const $ = await this.fetch();
    if (!$) return [];

    const results = [];

    $('.result-item, .election-seat, article.result').each((i, el) => {
      try {
        const constituency = $(el).find('.seat, .constituency-name').text().trim();
        const candidate = $(el).find('.candidate, .winner').text().trim();
        const party = $(el).find('.party, .party-name').text().trim();
        const votes = parseInt($(el).find('.votes, .count').text().replace(/,/g, '')) || 0;

        if (constituency && candidate) {
          results.push({ constituency, candidate, party, votes, source: this.name });
        }
      } catch (e) { /* skip */ }
    });

    return results;
  }
}

// ─── JSON API SCRAPER (for sources with APIs) ────────────
class JsonApiScraper extends BaseScraper {
  constructor(name, url) {
    super(name, url);
  }

  async scrape() {
    try {
      const response = await axios.get(this.url, {
        headers: { 'User-Agent': USER_AGENT },
        timeout: 15000,
      });

      const data = response.data;
      if (!Array.isArray(data) && !data.results) return [];

      const items = Array.isArray(data) ? data : data.results;
      return items.map(item => ({
        constituency: item.constituency || item.seat || item.ason,
        candidate: item.candidate || item.winner || item.prarthi,
        party: item.party || item.dol,
        votes: parseInt(item.votes || item.vote_count) || 0,
        source: this.name,
      })).filter(r => r.constituency && r.candidate);
    } catch (err) {
      console.error(`❌ API scrape failed for ${this.name}: ${err.message}`);
      return [];
    }
  }
}

// ─── RESULT PROCESSOR ────────────────────────────────────
function processScrapedResults(results) {
  const db = getDb();

  let updated = 0;
  let newResults = 0;

  for (const result of results) {
    try {
      // Find matching constituency
      const constituency = db.prepare(`
        SELECT id FROM constituencies
        WHERE name LIKE ? OR name LIKE ?
        LIMIT 1
      `).get(`%${result.constituency}%`, result.constituency);

      if (!constituency) continue;

      // Find matching candidate
      const candidate = db.prepare(`
        SELECT c.id FROM candidates c
        JOIN parties p ON p.id = c.party_id
        WHERE c.constituency_id = ?
        AND (c.name LIKE ? OR p.short_name LIKE ? OR p.name LIKE ?)
        LIMIT 1
      `).get(constituency.id, `%${result.candidate}%`, `%${result.party}%`, `%${result.party}%`);

      if (!candidate) continue;

      // Check if result exists
      const existing = db.prepare(`
        SELECT id, votes FROM results
        WHERE constituency_id = ? AND candidate_id = ?
      `).get(constituency.id, candidate.id);

      if (existing) {
        // Update if new votes are higher (more recent data)
        if (result.votes > existing.votes) {
          db.prepare(`
            UPDATE results
            SET votes = ?, source = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(result.votes, result.source, existing.id);
          updated++;

          // Broadcast update
          broadcastResultUpdate(constituency.id, {
            candidate_id: candidate.id,
            votes: result.votes,
            source: result.source
          });
        }
      } else {
        // Insert new result
        db.prepare(`
          INSERT INTO results (constituency_id, candidate_id, votes, source, updated_at)
          VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        `).run(constituency.id, candidate.id, result.votes, result.source);
        newResults++;
      }
    } catch (err) {
      // Skip individual record errors
    }
  }

  return { updated, newResults };
}

module.exports = {
  BaseScraper,
  ECSScraper,
  DailyStarScraper,
  ProthomAloScraper,
  BdNews24Scraper,
  JsonApiScraper,
  processScrapedResults,
};
