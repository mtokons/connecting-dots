const axios = require('axios');
const cheerio = require('cheerio');
const { getDb } = require('../db/database');
const { broadcastResultUpdate, broadcastBreaking } = require('../routes/sse');

/**
 * Web Scraper for Bangladesh Election 2026
 * 13th Jatiya Sangsad — 300 seats — Voting: 12 Feb 2026
 *
 * Primary Sources:
 *  1. election.results.com.bd  — live blog + predictions
 *  2. election.unb.com.bd      — UNB interactive map + news
 *  3. electionresult2026bd.com — result portal + search
 *  4. ecs.gov.bd               — Official Election Commission
 *  5. thedailystar.net         — The Daily Star election page
 *  6. prothomalo.com           — Prothom Alo election page
 *  7. bdnews24.com             — bdnews24 election page
 */

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

// ─── BASE SCRAPER ─────────────────────────────────────────
class BaseScraper {
  constructor(name, url) {
    this.name = name;
    this.url = url;
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

  async fetchJson(url) {
    try {
      const response = await axios.get(url || this.url, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
        timeout: 15000,
      });
      return response.data;
    } catch (err) {
      console.error(`❌ JSON fetch failed for ${this.name}: ${err.message}`);
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

// ─── 1. ELECTION RESULTS BD SCRAPER ──────────────────────
// https://election.results.com.bd + /live-update/
class ElectionResultsBDScraper extends BaseScraper {
  constructor() {
    super('Election Results BD', 'https://election.results.com.bd');
  }

  async scrape() {
    const results = [];

    // Main page — overall seat/candidate counts
    const $ = await this.fetch();
    if ($) {
      $('table tr').each((i, el) => {
        try {
          const cells = $(el).find('td');
          if (cells.length >= 2) {
            const col1 = $(cells[0]).text().trim();
            const col2 = $(cells[1]).text().trim();
            if (col1 && col2) {
              results.push({ constituency: 'SUMMARY', candidate: col1, party: col1, votes: parseInt(col2.replace(/,/g, '')) || 0, source: this.name });
            }
          }
        } catch (e) { /* skip */ }
      });
    }

    // Live update page — constituency results
    const $live = await this.fetch('https://election.results.com.bd/live-update/');
    if ($live) {
      $live('table tr, .result-row, .constituency-result').each((i, el) => {
        try {
          const text = $live(el).text();
          const match = text.match(/([A-Za-z\s'.-]+)-(\d+).*?([A-Za-z\s.]+)\s*\((\w+)\).*?([\d,]+)/);
          if (match) {
            results.push({
              constituency: `${match[1].trim()}-${match[2]}`,
              candidate: match[3].trim(),
              party: match[4].trim(),
              votes: parseInt(match[5].replace(/,/g, '')) || 0,
              source: this.name,
            });
          }
        } catch (e) { /* skip */ }
      });
    }

    return results;
  }
}

// ─── 2. UNB ELECTION PORTAL SCRAPER ──────────────────────
// https://election.unb.com.bd/
class UNBElectionScraper extends BaseScraper {
  constructor() {
    super('UNB Election Portal', 'https://election.unb.com.bd');
  }

  async scrape() {
    const results = [];

    const $ = await this.fetch();
    if (!$) return [];

    // Interactive map constituency markers
    $('[data-constituency], .constituency, .seat-marker, [data-id]').each((i, el) => {
      try {
        const constId = $(el).attr('data-constituency') || $(el).attr('data-id') || $(el).text().trim();
        const winner = $(el).attr('data-winner') || $(el).attr('data-candidate') || '';
        const party = $(el).attr('data-party') || '';
        const votes = parseInt($(el).attr('data-votes') || '0');
        if (constId && (winner || party)) {
          results.push({ constituency: constId, candidate: winner, party, votes, source: this.name });
        }
      } catch (e) { /* skip */ }
    });

    // News page — constituency-level updates
    const $news = await this.fetch('https://election.unb.com.bd/news.php');
    if ($news) {
      $news('article, .news-item, .card, a[href]').each((i, el) => {
        try {
          const title = $news(el).find('h3, h4, .title').first().text().trim() || $news(el).text().trim();
          const cat = $news(el).find('.badge, small').first().text().trim();
          const constMatch = (cat || title).match(/([A-Za-z\s'.-]+)-(\d+)/);
          if (constMatch) {
            results.push({
              constituency: `${constMatch[1].trim()}-${constMatch[2]}`,
              candidate: title.substring(0, 60),
              party: 'news',
              votes: 0,
              source: this.name + ' (news)',
            });
          }
        } catch (e) { /* skip */ }
      });
    }

    return results;
  }
}

// ─── 3. ELECTION RESULT 2026 BD SCRAPER ──────────────────
// https://electionresult2026bd.com/
class ElectionResult2026Scraper extends BaseScraper {
  constructor() {
    super('Election Result 2026 BD', 'https://electionresult2026bd.com');
  }

  async scrape() {
    const results = [];
    const $ = await this.fetch();
    if (!$) return [];

    // Voter demographics
    $('.stat-card, .demographic, .voter-stat').each((i, el) => {
      try {
        const label = $(el).find('.label, .title, h3, h4').text().trim();
        const value = $(el).find('.value, .count, .number, span').text().trim();
        if (label && value) {
          results.push({ constituency: 'DEMOGRAPHICS', candidate: label, party: 'info', votes: parseInt(value.replace(/[,\s]/g, '')) || 0, source: this.name });
        }
      } catch (e) { /* skip */ }
    });

    // District-wise result table
    $('table tr, .result-row, .district-result').each((i, el) => {
      try {
        const cells = $(el).find('td');
        if (cells.length >= 3) {
          const constituency = $(cells[0]).text().trim();
          const candidate = $(cells[1]).text().trim();
          const party = $(cells[2]).text().trim();
          const votes = cells.length > 3 ? parseInt($(cells[3]).text().replace(/,/g, '')) || 0 : 0;
          if (constituency && candidate) {
            results.push({ constituency, candidate, party, votes, source: this.name });
          }
        }
      } catch (e) { /* skip */ }
    });

    return results;
  }
}

// ─── 4. ELECTION COMMISSION SCRAPER ──────────────────────
class ECSScraper extends BaseScraper {
  constructor() {
    super('Bangladesh Election Commission', 'https://www.ecs.gov.bd');
  }

  async scrape() {
    const $ = await this.fetch();
    if (!$) return [];
    const results = [];
    $('table.result-table tr, .election-result-row, .result-card').each((i, el) => {
      try {
        const constituency = $(el).find('.constituency-name, td:nth-child(1)').text().trim();
        const candidate = $(el).find('.candidate-name, td:nth-child(2)').text().trim();
        const party = $(el).find('.party-name, td:nth-child(3)').text().trim();
        const votes = parseInt($(el).find('.votes, td:nth-child(4)').text().replace(/,/g, '')) || 0;
        if (constituency && candidate && votes > 0) {
          results.push({ constituency, candidate, party, votes, source: this.name });
        }
      } catch (e) { /* skip */ }
    });
    return results;
  }
}

// ─── 5. DAILY STAR SCRAPER ───────────────────────────────
class DailyStarScraper extends BaseScraper {
  constructor() {
    super('The Daily Star', 'https://www.thedailystar.net/election-2026');
  }

  async scrape() {
    const $ = await this.fetch();
    if (!$) return [];
    const results = [];
    $('.election-card, .result-card, .seat-result, article').each((i, el) => {
      try {
        const constituency = $(el).find('.seat-name, .constituency, h3').text().trim();
        const candidate = $(el).find('.winner-name, .candidate-name').text().trim();
        const party = $(el).find('.party, .party-name').text().trim();
        const votes = parseInt($(el).find('.votes, .vote-count').text().replace(/,/g, '')) || 0;
        if (constituency && candidate) {
          results.push({ constituency, candidate, party, votes, source: this.name });
        }
      } catch (e) { /* skip */ }
    });
    return results;
  }
}

// ─── 6. PROTHOM ALO SCRAPER ─────────────────────────────
class ProthomAloScraper extends BaseScraper {
  constructor() {
    super('Prothom Alo', 'https://www.prothomalo.com/election');
  }

  async scrape() {
    const $ = await this.fetch();
    if (!$) return [];
    const results = [];
    $('.election-result, .nirbachon-result, .seat-card, article').each((i, el) => {
      try {
        const constituency = $(el).find('.ason-name, .seat-title, h3').text().trim();
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

// ─── 7. BDNEWS24 SCRAPER ────────────────────────────────
class BdNews24Scraper extends BaseScraper {
  constructor() {
    super('bdnews24', 'https://bdnews24.com/election');
  }

  async scrape() {
    const $ = await this.fetch();
    if (!$) return [];
    const results = [];
    $('.result-item, .election-seat, article').each((i, el) => {
      try {
        const constituency = $(el).find('.seat, .constituency-name, h3').text().trim();
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

// ─── RESULT PROCESSOR ────────────────────────────────────
function processScrapedResults(results) {
  const db = getDb();
  let updated = 0;
  let newResults = 0;

  for (const result of results) {
    try {
      if (['PREDICTION', 'SUMMARY', 'DEMOGRAPHICS'].includes(result.constituency)) continue;
      const constituency = db.prepare(`SELECT id FROM constituencies WHERE name LIKE ? OR name LIKE ? LIMIT 1`)
        .get(`%${result.constituency}%`, result.constituency);
      if (!constituency) continue;

      const candidate = db.prepare(`
        SELECT c.id FROM candidates c
        JOIN parties p ON p.id = c.party_id
        WHERE c.constituency_id = ?
        AND (c.name LIKE ? OR p.short_name LIKE ? OR p.name LIKE ?)
        LIMIT 1
      `).get(constituency.id, `%${result.candidate}%`, `%${result.party}%`, `%${result.party}%`);
      if (!candidate) continue;

      const existing = db.prepare(`SELECT id, votes FROM results WHERE constituency_id = ? AND candidate_id = ?`)
        .get(constituency.id, candidate.id);

      if (existing) {
        if (result.votes > existing.votes) {
          db.prepare(`UPDATE results SET votes = ?, source = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
            .run(result.votes, result.source, existing.id);
          updated++;
          broadcastResultUpdate(constituency.id, { candidate_id: candidate.id, votes: result.votes, source: result.source });
        }
      } else {
        db.prepare(`INSERT INTO results (constituency_id, candidate_id, votes, source, updated_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`)
          .run(constituency.id, candidate.id, result.votes, result.source);
        newResults++;
      }
    } catch (err) { /* skip individual errors */ }
  }

  return { updated, newResults };
}

module.exports = {
  BaseScraper,
  ElectionResultsBDScraper,
  UNBElectionScraper,
  ElectionResult2026Scraper,
  ECSScraper,
  DailyStarScraper,
  ProthomAloScraper,
  BdNews24Scraper,
  processScrapedResults,
};
