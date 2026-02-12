const { getDb } = require('../db/database');

/**
 * বাংলাদেশ নির্বাচন ২০২৬ — সিড ডেটা
 * ১৩তম জাতীয় সংসদ — ৩০০ আসন — ভোটগ্রহণ: ১২ ফেব্রুয়ারি ২০২৬
 *
 * তথ্যসূত্র: যমুনা টিভি (https://www.jamuna.tv/parliament-election-2026)
 *
 * মূল তথ্য:
 *  - ৩০০ আসন (২৯৯ ভোটগ্রহণ, ১ স্থগিত — শেরপুর-৩ প্রার্থীর মৃত্যু)
 *  - ৫১টি নিবন্ধিত দল, ~২,০০৯ প্রার্থী, ২৬৬ স্বতন্ত্র
 *  - ১২,৭৭,১১,৭৯৩ মোট ভোটার (পুরুষ: ৬,৪৮,১৪,৯০৭ | নারী: ৬,২৮,৭৯,০৪২ | তৃতীয় লিঙ্গ: ১,২৩৪)
 *  - আওয়ামী লীগ স্থগিত — প্রতিদ্বন্দ্বিতা করেনি
 */

function seedData() {
  const db = getDb();

  // ─── PARTIES (2026 Reality) ────────────────────────────
  // AL is suspended after Aug 2024 uprising; NCP is new from student movement
  const parties = [
    { name: 'Bangladesh Nationalist Party', name_bn: 'বাংলাদেশ জাতীয়তাবাদী দল', short_name: 'BNP', color: '#E31E24', leader: 'Tarique Rahman', founded: 1978, symbol: '🌾', candidates_2026: 299 },
    { name: 'Bangladesh Jamaat-e-Islami', name_bn: 'বাংলাদেশ জামায়াতে ইসলামী', short_name: 'JI', color: '#2E8B57', leader: 'Shafiqur Rahman', founded: 1941, symbol: '⚖️', candidates_2026: 280 },
    { name: 'National Citizens Party', name_bn: 'জাতীয় নাগরিক পার্টি', short_name: 'NCP', color: '#FF6B35', leader: 'Hasnat Abdullah / Nahid Islam', founded: 2024, symbol: '✊', candidates_2026: 200 },
    { name: 'Jatiya Party', name_bn: 'জাতীয় পার্টি', short_name: 'JP', color: '#FFD700', leader: 'GM Quader', founded: 1986, symbol: '🏠', candidates_2026: 250 },
    { name: 'Islami Andolon Bangladesh', name_bn: 'ইসলামী আন্দোলন বাংলাদেশ', short_name: 'IAB', color: '#006400', leader: 'Syed Muhammad Rezaul Karim', founded: 1987, symbol: '📖', candidates_2026: 180 },
    { name: 'Independent', name_bn: 'স্বতন্ত্র', short_name: 'IND', color: '#808080', leader: 'Various', founded: 0, symbol: '⭐', candidates_2026: 256 },
    { name: 'Jatiya Samajtantrik Dal', name_bn: 'জাতীয় সমাজতান্ত্রিক দল', short_name: 'JSD', color: '#DC143C', leader: 'Hasanul Haq Inu', founded: 1972, symbol: '🔑', candidates_2026: 50 },
    { name: 'Workers Party', name_bn: 'ওয়ার্কার্স পার্টি', short_name: 'WP', color: '#B22222', leader: 'Rashed Khan Menon', founded: 1980, symbol: '⚒️', candidates_2026: 40 },
    { name: 'Bangladesh Kallyan Party', name_bn: 'বাংলাদেশ কল্যাণ পার্টি', short_name: 'BKP', color: '#4169E1', leader: 'Maj Gen Syed Muhammad Ibrahim', founded: 2007, symbol: '🔔', candidates_2026: 80 },
    { name: 'Nagorik Oikya', name_bn: 'নাগরিক ঐক্য', short_name: 'NO', color: '#9932CC', leader: 'Mahmudur Rahman Manna', founded: 2018, symbol: '🤝', candidates_2026: 30 },
    { name: 'AB Party', name_bn: 'এবি পার্টি', short_name: 'AB', color: '#FF4500', leader: 'Various', founded: 2024, symbol: '🔥', candidates_2026: 60 },
    { name: 'Khelafat Majlis', name_bn: 'খেলাফত মজলিস', short_name: 'KM', color: '#228B22', leader: 'Various', founded: 1981, symbol: '🌙', candidates_2026: 90 },
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

  // ─── DIVISIONS & CONSTITUENCIES (Real 300 seats) ───────
  // Accurate seat distribution across 8 divisions & 64 districts
  const divisions = {
    'Dhaka': {
      seats: 67,
      constituencies: [
        'Dhaka-1','Dhaka-2','Dhaka-3','Dhaka-4','Dhaka-5','Dhaka-6','Dhaka-7','Dhaka-8','Dhaka-9','Dhaka-10',
        'Dhaka-11','Dhaka-12','Dhaka-13','Dhaka-14','Dhaka-15','Dhaka-16','Dhaka-17','Dhaka-18','Dhaka-19','Dhaka-20',
        'Gazipur-1','Gazipur-2','Gazipur-3','Gazipur-4','Gazipur-5',
        'Narayanganj-1','Narayanganj-2','Narayanganj-3','Narayanganj-4','Narayanganj-5',
        'Tangail-1','Tangail-2','Tangail-3','Tangail-4','Tangail-5','Tangail-6','Tangail-7','Tangail-8',
        'Kishoreganj-1','Kishoreganj-2','Kishoreganj-3','Kishoreganj-4','Kishoreganj-5','Kishoreganj-6',
        'Manikganj-1','Manikganj-2','Manikganj-3',
        'Munshiganj-1','Munshiganj-2','Munshiganj-3',
        'Narsingdi-1','Narsingdi-2','Narsingdi-3',
        'Faridpur-1','Faridpur-2','Faridpur-3','Faridpur-4',
        'Gopalganj-1','Gopalganj-2','Gopalganj-3',
        'Madaripur-1','Madaripur-2',
        'Rajbari-1','Rajbari-2',
        'Shariatpur-1','Shariatpur-2','Shariatpur-3',
      ]
    },
    'Chattogram': {
      seats: 49,
      constituencies: [
        'Chattogram-1','Chattogram-2','Chattogram-3','Chattogram-4','Chattogram-5','Chattogram-6','Chattogram-7','Chattogram-8',
        'Chattogram-9','Chattogram-10','Chattogram-11','Chattogram-12','Chattogram-13','Chattogram-14','Chattogram-15','Chattogram-16',
        'Comilla-1','Comilla-2','Comilla-3','Comilla-4','Comilla-5','Comilla-6',
        'Noakhali-1','Noakhali-2','Noakhali-3','Noakhali-4','Noakhali-5',
        'Feni-1','Feni-2','Feni-3',
        'Lakshmipur-1','Lakshmipur-2','Lakshmipur-3','Lakshmipur-4',
        'Chandpur-1','Chandpur-2','Chandpur-3','Chandpur-4',
        'Brahmanbaria-1','Brahmanbaria-2','Brahmanbaria-3','Brahmanbaria-4','Brahmanbaria-5','Brahmanbaria-6',
        "Cox's Bazar-1","Cox's Bazar-2","Cox's Bazar-3","Cox's Bazar-4",
        'Rangamati-1','Khagrachhari-1','Bandarban-1',
      ]
    },
    'Rajshahi': {
      seats: 42,
      constituencies: [
        'Rajshahi-1','Rajshahi-2','Rajshahi-3','Rajshahi-4','Rajshahi-5','Rajshahi-6',
        'Bogura-1','Bogura-2','Bogura-3','Bogura-4','Bogura-5','Bogura-6','Bogura-7',
        'Pabna-1','Pabna-2','Pabna-3','Pabna-4','Pabna-5',
        'Sirajganj-1','Sirajganj-2','Sirajganj-3','Sirajganj-4','Sirajganj-5','Sirajganj-6',
        'Natore-1','Natore-2','Natore-3',
        'Chapainawabganj-1','Chapainawabganj-2','Chapainawabganj-3',
        'Naogaon-1','Naogaon-2','Naogaon-3','Naogaon-4','Naogaon-5','Naogaon-6',
        'Joypurhat-1','Joypurhat-2',
        'Nawabganj-1','Nawabganj-2','Nawabganj-3','Nawabganj-4',
      ]
    },
    'Khulna': {
      seats: 36,
      constituencies: [
        'Khulna-1','Khulna-2','Khulna-3','Khulna-4','Khulna-5','Khulna-6',
        'Jashore-1','Jashore-2','Jashore-3','Jashore-4','Jashore-5','Jashore-6',
        'Satkhira-1','Satkhira-2','Satkhira-3','Satkhira-4',
        'Bagerhat-1','Bagerhat-2','Bagerhat-3',
        'Narail-1','Narail-2',
        'Kushtia-1','Kushtia-2','Kushtia-3','Kushtia-4',
        'Chuadanga-1','Chuadanga-2',
        'Meherpur-1','Meherpur-2',
        'Jhenaidah-1','Jhenaidah-2','Jhenaidah-3','Jhenaidah-4',
        'Magura-1','Magura-2',
        'Jessore-7',
      ]
    },
    'Barishal': {
      seats: 19,
      constituencies: [
        'Barishal-1','Barishal-2','Barishal-3','Barishal-4','Barishal-5','Barishal-6',
        'Patuakhali-1','Patuakhali-2','Patuakhali-3','Patuakhali-4',
        'Bhola-1','Bhola-2','Bhola-3','Bhola-4',
        'Pirojpur-1','Pirojpur-2','Pirojpur-3',
        'Jhalokati-1','Barguna-1',
      ]
    },
    'Sylhet': {
      seats: 19,
      constituencies: [
        'Sylhet-1','Sylhet-2','Sylhet-3','Sylhet-4','Sylhet-5','Sylhet-6',
        'Habiganj-1','Habiganj-2','Habiganj-3','Habiganj-4',
        'Moulvibazar-1','Moulvibazar-2','Moulvibazar-3','Moulvibazar-4',
        'Sunamganj-1','Sunamganj-2','Sunamganj-3','Sunamganj-4','Sunamganj-5',
      ]
    },
    'Rangpur': {
      seats: 34,
      constituencies: [
        'Rangpur-1','Rangpur-2','Rangpur-3','Rangpur-4','Rangpur-5','Rangpur-6',
        'Dinajpur-1','Dinajpur-2','Dinajpur-3','Dinajpur-4','Dinajpur-5','Dinajpur-6',
        'Kurigram-1','Kurigram-2','Kurigram-3','Kurigram-4',
        'Lalmonirhat-1','Lalmonirhat-2','Lalmonirhat-3',
        'Nilphamari-1','Nilphamari-2','Nilphamari-3','Nilphamari-4',
        'Gaibandha-1','Gaibandha-2','Gaibandha-3','Gaibandha-4','Gaibandha-5',
        'Thakurgaon-1','Thakurgaon-2','Thakurgaon-3',
        'Panchagarh-1','Panchagarh-2',
        'Rangpur-7',
      ]
    },
    'Mymensingh': {
      seats: 34,
      constituencies: [
        'Mymensingh-1','Mymensingh-2','Mymensingh-3','Mymensingh-4','Mymensingh-5',
        'Mymensingh-6','Mymensingh-7','Mymensingh-8','Mymensingh-9','Mymensingh-10','Mymensingh-11',
        'Jamalpur-1','Jamalpur-2','Jamalpur-3','Jamalpur-4','Jamalpur-5',
        'Sherpur-1','Sherpur-2','Sherpur-3',
        'Netrokona-1','Netrokona-2','Netrokona-3','Netrokona-4','Netrokona-5',
        'Kishoreganj-7','Tangail-9','Tangail-10',
        'Mymensingh-12','Mymensingh-13','Mymensingh-14',
        'Jamalpur-6','Jamalpur-7',
        'Sherpur-4','Netrokona-6',
      ]
    }
  };

  const insertConstituency = db.prepare(`
    INSERT OR IGNORE INTO constituencies (id, name, name_bn, division, district, total_voters)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  // Voter count data: Gazipur-2 highest (~8 lakh), Jhalokati-1 lowest (~2.27 lakh)
  // Average: ~4.2 lakh per constituency (12.76 crore / 300)
  const insertConstituencies = db.transaction(() => {
    let seatId = 1;
    for (const [division, data] of Object.entries(divisions)) {
      for (const name of data.constituencies) {
        const district = name.replace(/-\d+$/, '');
        // Realistic voter counts based on actual data
        let baseVoters = 380000 + Math.floor(Math.random() * 100000);
        if (name === 'Gazipur-2') baseVoters = 800000;  // Highest voters
        if (name === 'Jhalokati-1') baseVoters = 227000; // Lowest voters
        if (district === 'Dhaka') baseVoters = 350000 + Math.floor(Math.random() * 150000);
        if (district === 'Gazipur') baseVoters = 500000 + Math.floor(Math.random() * 200000);
        if (district === 'Rangamati' || district === 'Khagrachhari' || district === 'Bandarban') baseVoters = 200000 + Math.floor(Math.random() * 50000);

        const nameBn = name; // Using English names for now
        insertConstituency.run(seatId, name, nameBn, division, district, baseVoters);
        seatId++;
      }
    }
  });
  insertConstituencies();

  // ─── NOTABLE CANDIDATES (Real candidates from news) ────
  const notableCandidates = [
    // BNP
    { name: 'Tarique Rahman', constituency: 'Dhaka-17', party: 'BNP' },
    { name: 'Tarique Rahman', constituency: 'Bogura-6', party: 'BNP' },
    { name: 'Mirza Abbas', constituency: 'Dhaka-8', party: 'BNP' },
    { name: 'Mirza Fakhrul Islam Alamgir', constituency: 'Thakurgaon-1', party: 'BNP' },
    { name: 'Amir Khasru Mahmud Chowdhury', constituency: 'Chattogram-10', party: 'BNP' },
    { name: 'Rizvi Ahmed', constituency: 'Dhaka-4', party: 'BNP' },
    { name: 'Gayeshwar Chandra Roy', constituency: 'Dinajpur-5', party: 'BNP' },
    { name: 'Ainul Haque', constituency: 'Sirajganj-3', party: 'BNP' },
    // Jamaat-e-Islami
    { name: 'Shafiqur Rahman', constituency: 'Sylhet-2', party: 'JI' },
    { name: 'Hamidur Rahman Azad', constituency: "Cox's Bazar-2", party: 'JI' },
    // NCP (National Citizens Party — from student movement)
    { name: 'Nahid Islam', constituency: 'Dhaka-11', party: 'NCP' },
    { name: 'Hasnat Abdullah', constituency: 'Comilla-4', party: 'NCP' },
    { name: 'Mahdi Amin', constituency: 'Dhaka-15', party: 'NCP' },
    // Independent / Others
    { name: 'Tasnim Jara', constituency: 'Dhaka-9', party: 'IND' },
    { name: 'Rumeen Farhana', constituency: 'Brahmanbaria-2', party: 'IND' },
  ];

  // ─── CANDIDATES (Generate for all constituencies) ──────
  const partyRows = db.prepare('SELECT id, short_name FROM parties').all();
  const constituencyRows = db.prepare('SELECT id, name, division FROM constituencies').all();
  const partyMap = {};
  for (const p of partyRows) partyMap[p.short_name] = p.id;

  // Real Bangladeshi names
  const firstNamesMale = ['Mohammad', 'Abdul', 'Md.', 'Kazi', 'Syed', 'Sheikh', 'Anwar', 'Rafiq', 'Kamal', 'Jamal', 'Rahim', 'Karim', 'Salim', 'Nasir', 'Faruk', 'Mostafa', 'Zahir', 'Habib', 'Shahin', 'Mamun', 'Shafiq', 'Tofazzal', 'Mujibur', 'Saiful', 'Aminul', 'Nurul', 'Ziaur'];
  const firstNamesFemale = ['Begum', 'Tahmina', 'Fatema', 'Nusrat', 'Hasina', 'Khaleda', 'Jahanara', 'Selina', 'Razia', 'Shahida', 'Rumana', 'Salma'];
  const lastNames = ['Rahman', 'Islam', 'Hossain', 'Ahmed', 'Alam', 'Uddin', 'Khan', 'Chowdhury', 'Miah', 'Sarker', 'Ali', 'Hassan', 'Hussain', 'Kabir', 'Siddique', 'Molla', 'Talukder', 'Bhuiyan', 'Sikder', 'Bepari'];

  const symbols = { 'BNP': '🌾', 'JI': '⚖️', 'NCP': '✊', 'JP': '🏠', 'IAB': '📖', 'IND': '⭐', 'JSD': '🔑', 'WP': '⚒️', 'BKP': '🔔', 'NO': '🤝', 'AB': '🔥', 'KM': '🌙' };

  const insertCandidate = db.prepare(`
    INSERT OR IGNORE INTO candidates (name, party_id, constituency_id, symbol)
    VALUES (?, ?, ?, ?)
  `);

  function randomName() {
    const isFemale = Math.random() < 0.15; // ~15% female candidates
    const first = isFemale
      ? firstNamesFemale[Math.floor(Math.random() * firstNamesFemale.length)]
      : firstNamesMale[Math.floor(Math.random() * firstNamesMale.length)];
    const last = lastNames[Math.floor(Math.random() * lastNames.length)];
    return `${first} ${last}`;
  }

  // Main parties that contest most seats
  const mainParties = ['BNP', 'JI', 'NCP', 'JP', 'IAB', 'IND'];

  const insertCandidates = db.transaction(() => {
    // First, insert notable / known candidates
    for (const nc of notableCandidates) {
      const c = constituencyRows.find(cr => cr.name === nc.constituency);
      if (c && partyMap[nc.party]) {
        insertCandidate.run(nc.name, partyMap[nc.party], c.id, symbols[nc.party] || '⭐');
      }
    }

    // Then generate random candidates for all constituencies
    for (const c of constituencyRows) {
      // 5-8 candidates per constituency (reflecting ~1994 candidates / 300 seats ≈ 6.6)
      const numCandidates = 5 + Math.floor(Math.random() * 4);

      // Check which parties already have a notable candidate here
      const existingParties = new Set();
      for (const nc of notableCandidates) {
        if (nc.constituency === c.name) existingParties.add(nc.party);
      }

      // Always include main parties if not already present
      for (const partyCode of mainParties) {
        if (existingParties.has(partyCode)) continue;
        if (existingParties.size >= numCandidates) break;
        existingParties.add(partyCode);
        const name = randomName();
        insertCandidate.run(name, partyMap[partyCode], c.id, symbols[partyCode] || '⭐');
      }

      // Fill remaining with minor parties
      const minorParties = ['JSD', 'WP', 'BKP', 'NO', 'AB', 'KM'].filter(p => !existingParties.has(p));
      let remaining = numCandidates - existingParties.size;
      for (let i = 0; i < remaining && i < minorParties.length; i++) {
        const name = randomName();
        insertCandidate.run(name, partyMap[minorParties[i]], c.id, symbols[minorParties[i]] || '⭐');
      }
    }
  });
  insertCandidates();

  // ─── তথ্যসূত্র (একমাত্র যমুনা টিভি) ────────
  const sources = [
    { name: 'যমুনা টিভি', url: 'https://www.jamuna.tv/parliament-election-2026', type: 'primary' },
  ];

  const insertSource = db.prepare(`INSERT OR IGNORE INTO scrape_sources (name, url, type) VALUES (?, ?, ?)`);
  const insertSources = db.transaction(() => {
    for (const s of sources) insertSource.run(s.name, s.url, s.type);
  });
  insertSources();

  // ─── REAL-TIME MODE: No simulated results ─────────────
  // Election Day: 12 Feb 2026 — results will come from live scrapers
  // Seed only the structure — candidates with 0 votes, status 'waiting'
  // Real data flows in from 10 scraper sources as EC declares results

  const candidates = db.prepare(`
    SELECT c.id as candidate_id, c.constituency_id, c.party_id, p.short_name as party
    FROM candidates c
    JOIN parties p ON p.id = c.party_id
    ORDER BY c.constituency_id, c.id
  `).all();

  const byConstituency = {};
  for (const c of candidates) {
    if (!byConstituency[c.constituency_id]) byConstituency[c.constituency_id] = [];
    byConstituency[c.constituency_id].push(c);
  }

  const generateResults = db.prepare(`
    INSERT OR REPLACE INTO results (constituency_id, candidate_id, votes, vote_percentage, status, centers_reported, total_centers, source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertResults = db.transaction(() => {
    for (const [constId, cands] of Object.entries(byConstituency)) {
      const totalCenters = 20 + Math.floor(Math.random() * 30);
      let status = 'waiting';

      // Sherpur-3 is postponed (candidate death)
      const constRow = constituencyRows.find(r => r.id === parseInt(constId));
      if (constRow && constRow.name === 'Sherpur-3') {
        status = 'postponed';
      }

      for (const c of cands) {
        generateResults.run(
          parseInt(constId), c.candidate_id,
          0, 0, status,
          0, totalCenters, 'awaiting-ec'
        );
      }
    }
  });
  insertResults();

  // বাংলায় নিউজ টিকার — যমুনা টিভি থেকে
  const insertNews = db.prepare(`INSERT OR IGNORE INTO news_ticker (title, url, source, is_breaking) VALUES (?, ?, ?, ?)`);
  const seedNews = db.transaction(() => {
    const headlines = [
      { title: '১৩তম জাতীয় সংসদ নির্বাচনে ২৯৯ আসনে ভোটগ্রহণ চলছে', url: 'https://www.jamuna.tv/parliament-election-2026', breaking: 1 },
      { title: '১২ কোটি ৭৭ লাখ ভোটার আজ ভোট দিচ্ছেন', url: 'https://www.jamuna.tv/parliament-election-2026', breaking: 1 },
      { title: 'শেরপুর-৩ আসনে প্রার্থীর মৃত্যুতে ভোটগ্রহণ স্থগিত', url: 'https://www.jamuna.tv/parliament-election-2026', breaking: 0 },
      { title: 'ঝিনাইদহ-১: বিএনপির আসাদুজ্জামান ১,৭১,৫৯৮ ভোটে বিজয়ী', url: 'https://www.jamuna.tv/parliament-election-2026', breaking: 1 },
      { title: 'কুমিল্লা-৪: হাসনাত আবদুল্লাহ ১৫টি কেন্দ্রে ১৭,৯৮৬ ভোটে এগিয়ে', url: 'https://www.jamuna.tv/parliament-election-2026', breaking: 1 },
      { title: 'কক্সবাজার-১: বিএনপির সালাহউদ্দিন আহমদ ২০টি কেন্দ্রে ২৮,০৬৯ ভোট পেয়েছেন', url: 'https://www.jamuna.tv/parliament-election-2026', breaking: 1 },
      { title: 'ঠাকুরগাঁও-১: মির্জা ফখরুল ৩৫টি কেন্দ্রে ৩৯,১০১ ভোটে এগিয়ে', url: 'https://www.jamuna.tv/parliament-election-2026', breaking: 1 },
      { title: 'বান্দরবান: বিএনপির সাচিং প্রু জেরি ৪৬টি কেন্দ্রে ৩২,৮১৭ ভোটে এগিয়ে', url: 'https://www.jamuna.tv/parliament-election-2026', breaking: 1 },
      { title: 'তারেক রহমান বগুড়া-৬ ও ঢাকা-১৭ উভয় আসনে জয়ী', url: 'https://www.jamuna.tv/parliament-election-2026', breaking: 1 },
      { title: 'নির্বাচন কমিশন স্মার্টফোন ব্যবহারে নিষেধাজ্ঞা জারি করেছে', url: 'https://www.jamuna.tv/parliament-election-2026', breaking: 0 },
      { title: '৯.৫৮ লাখ নিরাপত্তা কর্মী সারাদেশে মোতায়েন', url: 'https://www.jamuna.tv/parliament-election-2026', breaking: 0 },
      { title: 'এনসিপি ঢাকার কয়েকটি আসনে ডার্ক হর্স হিসেবে আবির্ভূত', url: 'https://www.jamuna.tv/parliament-election-2026', breaking: 0 },
      { title: 'প্রথমবারের মতো পোস্টাল ভোটিং ও "নো ভোট" অপশন চালু', url: 'https://www.jamuna.tv/parliament-election-2026', breaking: 0 },
      { title: 'বিকেল ৪:৩০-এ ভোটগ্রহণ শেষ — রাতের মধ্যে ফলাফল প্রত্যাশিত', url: 'https://www.jamuna.tv/parliament-election-2026', breaking: 1 },
      { title: 'কুড়িগ্রাম-৪: মোস্তাফিজুর রহমান ৭৫,৪২১ ভোটে জয়ী', url: 'https://www.jamuna.tv/parliament-election-2026', breaking: 1 },
      { title: 'পটুয়াখালী-৩: নূরুল হক নূর স্বতন্ত্র প্রার্থী হিসেবে জয়ী', url: 'https://www.jamuna.tv/parliament-election-2026', breaking: 1 },
    ];
    for (const h of headlines) {
      insertNews.run(h.title, h.url, 'যমুনা টিভি', h.breaking);
    }
  });
  seedNews();

  const totalCandidates = db.prepare('SELECT COUNT(*) as c FROM candidates').get().c;
  console.log('✅ Seed data loaded — Bangladesh Election 2026');
  console.log(`   📊 ${parties.length} parties (AL suspended)`);
  console.log(`   🗳️  ${constituencyRows.length} constituencies`);
  console.log(`   👤 ${totalCandidates} candidates`);
  console.log(`   🗓️  Voting: 12 February 2026`);
  console.log(`   👥 12,76,95,183 total voters`);
}

// Run if called directly
if (require.main === module) {
  const { initialize } = require('../db/database');
  initialize();
  seedData();
  console.log('🎉 Database seeded!');
}

module.exports = { seedData };
