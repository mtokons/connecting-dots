const { getDb } = require('../db/database');

/**
 * Seed data for Bangladesh Election 2026
 * 300 constituencies across 8 divisions
 * Major political parties with realistic data
 */

function seedData() {
  const db = getDb();

  // ─── PARTIES ───────────────────────────────────────────
  const parties = [
    { name: 'Bangladesh Awami League', name_bn: 'বাংলাদেশ আওয়ামী লীগ', short_name: 'AL', color: '#00A651', leader: 'Sheikh Hasina', founded: 1949 },
    { name: 'Bangladesh Nationalist Party', name_bn: 'বাংলাদেশ জাতীয়তাবাদী দল', short_name: 'BNP', color: '#E31E24', leader: 'Khaleda Zia', founded: 1978 },
    { name: 'Jatiya Party', name_bn: 'জাতীয় পার্টি', short_name: 'JP', color: '#FFD700', leader: 'GM Quader', founded: 1986 },
    { name: 'Jamaat-e-Islami', name_bn: 'জামায়াতে ইসলামী', short_name: 'JI', color: '#2E8B57', leader: 'Shafiqur Rahman', founded: 1941 },
    { name: 'Jatiya Samajtantrik Dal', name_bn: 'জাতীয় সমাজতান্ত্রিক দল', short_name: 'JSD', color: '#FF6B35', leader: 'Hasanul Haq Inu', founded: 1972 },
    { name: 'Workers Party', name_bn: 'ওয়ার্কার্স পার্টি', short_name: 'WP', color: '#DC143C', leader: 'Rashed Khan Menon', founded: 1980 },
    { name: 'Bangladesh Kallyan Party', name_bn: 'বাংলাদেশ কল্যাণ পার্টি', short_name: 'BKP', color: '#4169E1', leader: 'Maj Gen Syed Muhammad Ibrahim', founded: 2007 },
    { name: 'Independent', name_bn: 'স্বতন্ত্র', short_name: 'IND', color: '#808080', leader: 'Various', founded: 0 },
    { name: 'Islami Andolan Bangladesh', name_bn: 'ইসলামী আন্দোলন বাংলাদেশ', short_name: 'IAB', color: '#006400', leader: 'Syed Muhammad Rezaul Karim', founded: 1987 },
    { name: 'Nagorik Oikya', name_bn: 'নাগরিক ঐক্য', short_name: 'NO', color: '#9932CC', leader: 'Mahmudur Rahman Manna', founded: 2018 },
  ];

  const insertParty = db.prepare(`
    INSERT OR IGNORE INTO parties (name, name_bn, short_name, color, leader, founded)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertParties = db.transaction(() => {
    for (const p of parties) {
      insertParty.run(p.name, p.name_bn, p.short_name, p.color, p.leader, p.founded);
    }
  });
  insertParties();

  // ─── DIVISIONS & CONSTITUENCIES ─────────────────────────
  const divisions = {
    'Dhaka': { seats: 67, districts: ['Dhaka', 'Gazipur', 'Narayanganj', 'Tangail', 'Kishoreganj', 'Manikganj', 'Munshiganj', 'Narsingdi', 'Faridpur', 'Gopalganj', 'Madaripur', 'Rajbari', 'Shariatpur'] },
    'Chattogram': { seats: 49, districts: ['Chattogram', 'Comilla', 'Noakhali', 'Feni', 'Lakshmipur', 'Chandpur', 'Brahmanbaria', "Cox's Bazar", 'Rangamati', 'Khagrachhari', 'Bandarban'] },
    'Rajshahi': { seats: 42, districts: ['Rajshahi', 'Bogra', 'Pabna', 'Sirajganj', 'Natore', 'Nawabganj', 'Naogaon', 'Joypurhat'] },
    'Khulna': { seats: 36, districts: ['Khulna', 'Jessore', 'Satkhira', 'Bagerhat', 'Narail', 'Kushtia', 'Chuadanga', 'Meherpur', 'Jhenaidah', 'Magura'] },
    'Barishal': { seats: 19, districts: ['Barishal', 'Patuakhali', 'Bhola', 'Pirojpur', 'Jhalokathi', 'Barguna'] },
    'Sylhet': { seats: 19, districts: ['Sylhet', 'Habiganj', 'Moulvibazar', 'Sunamganj'] },
    'Rangpur': { seats: 34, districts: ['Rangpur', 'Dinajpur', 'Kurigram', 'Lalmonirhat', 'Nilphamari', 'Gaibandha', 'Thakurgaon', 'Panchagarh'] },
    'Mymensingh': { seats: 34, districts: ['Mymensingh', 'Jamalpur', 'Sherpur', 'Netrokona'] }
  };

  const insertConstituency = db.prepare(`
    INSERT OR IGNORE INTO constituencies (id, name, name_bn, division, district, total_voters)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertConstituencies = db.transaction(() => {
    let seatId = 1;
    for (const [division, data] of Object.entries(divisions)) {
      const seatsPerDistrict = Math.ceil(data.seats / data.districts.length);
      let remaining = data.seats;

      for (const district of data.districts) {
        const districtSeats = Math.min(seatsPerDistrict, remaining);
        for (let i = 1; i <= districtSeats; i++) {
          const name = `${district}-${i}`;
          const totalVoters = 200000 + Math.floor(Math.random() * 200000);
          insertConstituency.run(seatId, name, name, division, district, totalVoters);
          seatId++;
          remaining--;
          if (remaining <= 0) break;
        }
        if (remaining <= 0) break;
      }
    }
  });
  insertConstituencies();

  // ─── CANDIDATES ─────────────────────────────────────────
  const firstNames = ['Mohammad', 'Abdul', 'Sheikh', 'Md.', 'Kazi', 'Syed', 'Begum', 'Tahmina', 'Fatema', 'Nusrat', 'Anwar', 'Rafiq', 'Kamal', 'Jamal', 'Hasina', 'Khaleda', 'Rahim', 'Karim', 'Salim', 'Nasir'];
  const lastNames = ['Rahman', 'Islam', 'Hossain', 'Ahmed', 'Alam', 'Uddin', 'Khan', 'Chowdhury', 'Begum', 'Khatun', 'Miah', 'Sarker', 'Ali', 'Hassan', 'Hussain', 'Kabir', 'Siddique', 'Akter', 'Sultana', 'Molla'];

  const partyRows = db.prepare('SELECT id FROM parties').all();
  const constituencyRows = db.prepare('SELECT id FROM constituencies').all();

  const insertCandidate = db.prepare(`
    INSERT OR IGNORE INTO candidates (name, party_id, constituency_id, symbol)
    VALUES (?, ?, ?, ?)
  `);

  const symbols = ['⛵', '🌾', '⭐', '🏠', '🔑', '📖', '🌹', '🏏', '🎯', '🔔'];

  const insertCandidates = db.transaction(() => {
    for (const c of constituencyRows) {
      // Add candidates from major parties (at least 4-6 per constituency)
      const numCandidates = 4 + Math.floor(Math.random() * 4);
      const shuffledParties = [...partyRows].sort(() => Math.random() - 0.5).slice(0, numCandidates);

      for (let i = 0; i < shuffledParties.length; i++) {
        const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
        const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
        const name = `${firstName} ${lastName}`;
        const symbol = symbols[i % symbols.length];
        insertCandidate.run(name, shuffledParties[i].id, c.id, symbol);
      }
    }
  });
  insertCandidates();

  // ─── SCRAPE SOURCES ─────────────────────────────────────
  const sources = [
    { name: 'Bangladesh Election Commission', url: 'https://www.ecs.gov.bd', type: 'official' },
    { name: 'The Daily Star', url: 'https://www.thedailystar.net/election', type: 'news' },
    { name: 'Prothom Alo', url: 'https://www.prothomalo.com/election', type: 'news' },
    { name: 'bdnews24', url: 'https://bdnews24.com/election', type: 'news' },
    { name: 'Dhaka Tribune', url: 'https://www.dhakatribune.com/election', type: 'news' },
    { name: 'The Business Standard', url: 'https://www.tbsnews.net/election', type: 'news' },
    { name: 'Bangla Tribune', url: 'https://www.banglatribune.com/election', type: 'news' },
    { name: 'Samakal', url: 'https://samakal.com/election', type: 'news' },
  ];

  const insertSource = db.prepare(`
    INSERT OR IGNORE INTO scrape_sources (name, url, type)
    VALUES (?, ?, ?)
  `);

  const insertSources = db.transaction(() => {
    for (const s of sources) {
      insertSource.run(s.name, s.url, s.type);
    }
  });
  insertSources();

  // ─── GENERATE SAMPLE RESULTS ─────────────────────────────
  const generateResults = db.prepare(`
    INSERT OR REPLACE INTO results (constituency_id, candidate_id, votes, vote_percentage, status, centers_reported, total_centers, source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const candidates = db.prepare(`
    SELECT c.id as candidate_id, c.constituency_id, c.party_id
    FROM candidates c
    ORDER BY c.constituency_id, c.id
  `).all();

  // Group candidates by constituency
  const byConstituency = {};
  for (const c of candidates) {
    if (!byConstituency[c.constituency_id]) byConstituency[c.constituency_id] = [];
    byConstituency[c.constituency_id].push(c);
  }

  const insertResults = db.transaction(() => {
    for (const [constId, cands] of Object.entries(byConstituency)) {
      const totalCenters = 20 + Math.floor(Math.random() * 30);
      // Random progress: some done, some counting
      const progress = Math.random();
      let status, centersReported;

      if (progress < 0.3) {
        status = 'counting';
        centersReported = Math.floor(totalCenters * Math.random() * 0.5);
      } else if (progress < 0.7) {
        status = 'counting';
        centersReported = Math.floor(totalCenters * (0.5 + Math.random() * 0.4));
      } else {
        status = 'declared';
        centersReported = totalCenters;
      }

      let totalVotes = 0;
      const votes = cands.map(() => {
        const v = Math.floor(Math.random() * 80000) + 5000;
        totalVotes += v;
        return v;
      });

      for (let i = 0; i < cands.length; i++) {
        const pct = ((votes[i] / totalVotes) * 100).toFixed(2);
        generateResults.run(
          parseInt(constId), cands[i].candidate_id,
          votes[i], parseFloat(pct), status,
          centersReported, totalCenters, 'seed-data'
        );
      }
    }
  });
  insertResults();

  console.log('✅ Seed data loaded successfully');
  console.log(`   📊 ${parties.length} parties`);
  console.log(`   🗳️  ${constituencyRows.length} constituencies`);
  console.log(`   👤 ${candidates.length} candidates`);
}

// Run if called directly
if (require.main === module) {
  const { initialize } = require('../db/database');
  initialize();
  seedData();
  console.log('🎉 Database seeded!');
}

module.exports = { seedData };
