const { getDb } = require('../db/database');

function seedMediaData() {
  const db = getDb();
  console.log('🎙️ মিডিয়া কন্টেন্ট সিড করা হচ্ছে...');

  // ═══════════════════════════════════════════════════
  // SEED POSTS / NEWS ARTICLES
  // ═══════════════════════════════════════════════════
  const posts = [
    {
      title: 'বাংলাদেশ ২০২৬ নির্বাচন: বিএনপি ঐতিহাসিক জয়',
      slug: 'bangladesh-2026-election-bnp-historic-victory',
      content: `২০২৬ সালের ১৩তম জাতীয় সংসদ নির্বাচনে বিএনপি ৩০০ আসনের মধ্যে ২১৬টি আসনে জয়লাভ করে ঐতিহাসিক বিজয় অর্জন করেছে। জামায়াতে ইসলামী ৭০টি আসন পেয়ে দ্বিতীয় স্থানে রয়েছে। নির্বাচনে ১২ কোটি ৭৭ লাখ ভোটার তাদের ভোটাধিকার প্রয়োগ করেছেন।\n\nনির্বাচন কমিশন জানিয়েছে, ভোটগ্রহণ শান্তিপূর্ণভাবে সম্পন্ন হয়েছে। প্রথমবারের মতো পোস্টাল ভোটিং ও "নো ভোট" অপশন চালু করা হয়েছিল। শেরপুর-৩ আসনে ভোটগ্রহণ স্থগিত রাখা হয়েছে।\n\nতারেক রহমান বগুড়া-৬ ও ঢাকা-১৭ উভয় আসনে জয়ী হয়েছেন। সারাদেশে ৯.৫৮ লাখ নিরাপত্তা কর্মী মোতায়েন করা হয়েছিল।`,
      excerpt: '২০২৬ সালের নির্বাচনে বিএনপি ২১৬ আসন নিয়ে ঐতিহাসিক জয়লাভ করেছে।',
      cover_image: 'https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?w=800',
      category: 'politics',
      tags: '["নির্বাচন", "বিএনপি", "বাংলাদেশ", "২০২৬"]',
      author_name: 'Connecting Dots',
      is_featured: 1
    },
    {
      title: 'এআই পূর্বাভাস ও বাস্তবতা: কতটা সঠিক ছিল আমাদের মডেল?',
      slug: 'ai-prediction-vs-reality-analysis',
      content: `Connecting Dots-এর এআই পূর্বাভাস মডেল বেইসিয়ান ইনফারেন্স ও ফার্স্ট-পাস্ট-দ্য-পোস্ট সিমুলেশন ব্যবহার করে নির্বাচনী ফলাফল পূর্বাভাস দিয়েছিল। আমাদের মডেল বিএনপির জন্য ১৯৫-২৪০ আসনের পূর্বাভাস দিয়েছিল, যার মধ্যবিন্দু ছিল ২১০। বাস্তবে বিএনপি ২১৬ আসন পেয়েছে — মাত্র ৬ আসনের পার্থক্য।\n\nজামায়াতের জন্য আমাদের পূর্বাভাস ছিল ৬০-৮৫, তারা পেয়েছে ৭০ — একদম মধ্যবিন্দুতে। এনসিপি ও স্বতন্ত্র প্রার্থীদের ক্ষেত্রেও মডেল যথেষ্ট সঠিক ছিল।\n\nভবিষ্যতে আমরা আরও উন্নত মডেল তৈরি করব যা সোশ্যাল মিডিয়া সেন্টিমেন্ট, ঐতিহাসিক ভোটিং প্যাটার্ন এবং ডেমোগ্রাফিক ডেটা একত্রিত করবে।`,
      excerpt: 'আমাদের এআই মডেল বিএনপির জন্য ২১০ আসনের পূর্বাভাস দিয়েছিল, বাস্তবে পেয়েছে ২১৬।',
      cover_image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800',
      category: 'analysis',
      tags: '["এআই", "পূর্বাভাস", "ডেটা সায়েন্স"]',
      author_name: 'Connecting Dots AI',
      is_featured: 1
    },
    {
      title: 'বাংলাদেশে পডকাস্টিং: নতুন মিডিয়া যুগের সূচনা',
      slug: 'podcasting-in-bangladesh-new-media-era',
      content: `বাংলাদেশে পডকাস্টিং দ্রুত জনপ্রিয়তা পাচ্ছে। তরুণ প্রজন্ম ঐতিহ্যবাহী মিডিয়ার বাইরে গিয়ে পডকাস্টের মাধ্যমে তাদের মতামত প্রকাশ করছে। Connecting Dots এই নতুন মিডিয়া বিপ্লবের অংশ হতে চায়।\n\nআমাদের পডকাস্ট সিরিজে আমরা রাজনীতি, অর্থনীতি, প্রযুক্তি এবং সামাজিক ইস্যু নিয়ে আলোচনা করব। বিশেষজ্ঞ অতিথিদের সাথে গভীর সাক্ষাৎকার এবং বিশ্লেষণধর্মী আলোচনা থাকবে।\n\nলাইভ স্ট্রিমিং-এর মাধ্যমে দর্শকরা সরাসরি প্রশ্ন করতে এবং আলোচনায় অংশ নিতে পারবেন।`,
      excerpt: 'বাংলাদেশে পডকাস্টিং দ্রুত জনপ্রিয়তা পাচ্ছে। Connecting Dots নতুন মিডিয়া বিপ্লবের অংশ।',
      cover_image: 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=800',
      category: 'media',
      tags: '["পডকাস্ট", "মিডিয়া", "স্ট্রিমিং"]',
      author_name: 'Connecting Dots',
      is_featured: 0
    },
    {
      title: 'ঢাকার অর্থনৈতিক ভবিষ্যৎ: নতুন সরকারের চ্যালেঞ্জ',
      slug: 'dhaka-economic-future-new-government-challenges',
      content: `নতুন সরকার গঠনের পর বাংলাদেশের অর্থনীতি নিয়ে বিশ্লেষকদের মিশ্র প্রতিক্রিয়া রয়েছে। মুদ্রাস্ফীতি নিয়ন্ত্রণ, বৈদেশিক মুদ্রার রিজার্ভ বৃদ্ধি এবং কর্মসংস্থান সৃষ্টি নতুন সরকারের প্রধান অর্থনৈতিক চ্যালেঞ্জ।\n\nবিশ্বব্যাংক ও আইএমএফ বাংলাদেশের অর্থনৈতিক প্রবৃদ্ধি ৬.৫% প্রত্যাশা করছে। তবে রাজনৈতিক স্থিতিশীলতা এই লক্ষ্য অর্জনের পূর্বশর্ত।\n\nরপ্তানি খাতে বিশেষ করে পোশাক শিল্পে প্রবৃদ্ধি অব্যাহত রয়েছে। ডিজিটাল অর্থনীতি ও আইটি সেক্টরেও সম্ভাবনা দেখা যাচ্ছে।`,
      excerpt: 'নতুন সরকারের সামনে মুদ্রাস্ফীতি নিয়ন্ত্রণ ও কর্মসংস্থান সৃষ্টির চ্যালেঞ্জ।',
      cover_image: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800',
      category: 'economy',
      tags: '["অর্থনীতি", "বাংলাদেশ", "প্রবৃদ্ধি"]',
      author_name: 'Connecting Dots',
      is_featured: 0
    },
    {
      title: 'প্রযুক্তি ও গণতন্ত্র: ডিজিটাল ভোটিং কি সম্ভব?',
      slug: 'technology-democracy-digital-voting',
      content: `বিশ্বের অনেক দেশে ডিজিটাল ভোটিং নিয়ে পরীক্ষা-নিরীক্ষা চলছে। এস্তোনিয়া ইতিমধ্যে ই-ভোটিং সফলভাবে বাস্তবায়ন করেছে। বাংলাদেশেও কি এটি সম্ভব?\n\nসাইবার নিরাপত্তা, ভোটারদের গোপনীয়তা এবং প্রযুক্তিগত অবকাঠামো — এই তিনটি প্রধান চ্যালেঞ্জ মোকাবেলা করতে হবে। ব্লকচেইন প্রযুক্তি এক্ষেত্রে সমাধান হতে পারে।\n\nConnecting Dots এই বিষয়ে বিশেষজ্ঞদের সাথে একটি বিশেষ পডকাস্ট সিরিজ আয়োজন করবে।`,
      excerpt: 'ডিজিটাল ভোটিং কি বাংলাদেশে সম্ভব? প্রযুক্তি ও গণতন্ত্রের সম্পর্ক নিয়ে বিশ্লেষণ।',
      cover_image: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800',
      category: 'technology',
      tags: '["প্রযুক্তি", "গণতন্ত্র", "ডিজিটাল"]',
      author_name: 'Connecting Dots',
      is_featured: 0
    },
    {
      title: 'তারুণ্যের ভোট: ২০২৬ নির্বাচনে তরুণদের ভূমিকা',
      slug: 'youth-vote-2026-election-role',
      content: `২০২৬ সালের নির্বাচনে প্রথমবারের মতো ভোট দিয়েছেন প্রায় ২ কোটি তরুণ ভোটার। তাদের অংশগ্রহণ নির্বাচনের ফলাফলে গুরুত্বপূর্ণ প্রভাব ফেলেছে।\n\nসোশ্যাল মিডিয়া এবং ডিজিটাল প্ল্যাটফর্ম তরুণ ভোটারদের রাজনৈতিক সচেতনতা বৃদ্ধিতে গুরুত্বপূর্ণ ভূমিকা রেখেছে। ফেসবুক, ইউটিউব এবং টিকটকে রাজনৈতিক আলোচনা ব্যাপকভাবে হয়েছে।\n\nConnecting Dots-এর ডেটা অনুযায়ী, শহরাঞ্চলে তরুণ ভোটারদের টার্নআউট ৭৫% ছাড়িয়েছে।`,
      excerpt: 'প্রায় ২ কোটি তরুণ ভোটার প্রথমবার ভোট দিয়ে নির্বাচনে গুরুত্বপূর্ণ প্রভাব ফেলেছে।',
      cover_image: 'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=800',
      category: 'politics',
      tags: '["তারুণ্য", "ভোটার", "নির্বাচন"]',
      author_name: 'Connecting Dots',
      is_featured: 1
    }
  ];

  const insertPost = db.prepare(`
    INSERT OR IGNORE INTO posts (title, slug, content, excerpt, cover_image, category, tags, author_name, is_featured)
    VALUES (@title, @slug, @content, @excerpt, @cover_image, @category, @tags, @author_name, @is_featured)
  `);

  const batchPosts = db.transaction(() => {
    for (const post of posts) insertPost.run(post);
  });
  batchPosts();
  console.log(`  ✅ ${posts.length}টি পোস্ট সিড করা হয়েছে`);

  // ═══════════════════════════════════════════════════
  // SEED PODCASTS
  // ═══════════════════════════════════════════════════
  const podcasts = [
    {
      title: 'নির্বাচন বিশ্লেষণ: বিএনপির জয়ের কারণ',
      slug: 'election-analysis-bnp-victory-reasons',
      description: 'এই পর্বে আমরা ২০২৬ সালের নির্বাচনে বিএনপির ঐতিহাসিক জয়ের পেছনের কারণগুলো বিশ্লেষণ করব। আমাদের বিশেষ অতিথি রাজনৈতিক বিশ্লেষক ড. আহমেদ।',
      audio_url: null,
      video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      cover_image: 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=800',
      duration: 3600,
      episode_number: 1,
      season: 1,
      category: 'politics',
      host_name: 'Connecting Dots',
      guest_name: 'ড. আহমেদ রহমান'
    },
    {
      title: 'ডিজিটাল বাংলাদেশ থেকে স্মার্ট বাংলাদেশ',
      slug: 'digital-to-smart-bangladesh',
      description: 'বাংলাদেশের ডিজিটাল রূপান্তর নিয়ে আলোচনা। আইটি সেক্টরের সম্ভাবনা, চ্যালেঞ্জ এবং ভবিষ্যৎ পরিকল্পনা।',
      audio_url: null,
      video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      cover_image: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800',
      duration: 2700,
      episode_number: 2,
      season: 1,
      category: 'technology',
      host_name: 'Connecting Dots',
      guest_name: 'ফাহিম আহমেদ'
    },
    {
      title: 'বাংলাদেশের অর্থনীতি: সমস্যা ও সম্ভাবনা',
      slug: 'bangladesh-economy-problems-and-potential',
      description: 'অর্থনীতিবিদ ড. সেলিমের সাথে বাংলাদেশের অর্থনৈতিক চ্যালেঞ্জ ও সম্ভাবনা নিয়ে গভীর আলোচনা।',
      audio_url: null,
      video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      cover_image: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800',
      duration: 4200,
      episode_number: 3,
      season: 1,
      category: 'economy',
      host_name: 'Connecting Dots',
      guest_name: 'ড. সেলিম উদ্দিন'
    },
    {
      title: 'তরুণ উদ্যোক্তাদের গল্প',
      slug: 'young-entrepreneurs-stories',
      description: 'বাংলাদেশের সফল তরুণ উদ্যোক্তাদের সাথে আলোচনা। স্টার্টআপ ইকোসিস্টেম ও তরুণদের চ্যালেঞ্জ।',
      audio_url: null,
      video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      cover_image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800',
      duration: 3000,
      episode_number: 4,
      season: 1,
      category: 'business',
      host_name: 'Connecting Dots',
      guest_name: 'রাশেদ খান'
    }
  ];

  const insertPodcast = db.prepare(`
    INSERT OR IGNORE INTO podcasts (title, slug, description, audio_url, video_url, cover_image, duration, episode_number, season, category, host_name, guest_name)
    VALUES (@title, @slug, @description, @audio_url, @video_url, @cover_image, @duration, @episode_number, @season, @category, @host_name, @guest_name)
  `);

  const batchPodcasts = db.transaction(() => {
    for (const podcast of podcasts) insertPodcast.run(podcast);
  });
  batchPodcasts();
  console.log(`  ✅ ${podcasts.length}টি পডকাস্ট সিড করা হয়েছে`);

  // ═══════════════════════════════════════════════════
  // SEED STREAMS
  // ═══════════════════════════════════════════════════
  const streams = [
    {
      title: 'যমুনা টিভি লাইভ — নির্বাচন বিশেষ',
      description: 'যমুনা টিভির সরাসরি সম্প্রচার — বাংলাদেশ ১৩তম জাতীয় সংসদ নির্বাচন কভারেজ',
      stream_url: 'https://www.youtube.com/watch?v=live_stream&channel=UCN6sm8iHiPd0cnoUardDAnw',
      embed_url: 'https://www.youtube.com/embed/live_stream?channel=UCN6sm8iHiPd0cnoUardDAnw',
      thumbnail: 'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=800',
      status: 'live',
      scheduled_at: '2026-02-12T01:30:00.000Z',
      category: 'news'
    },
    {
      title: 'Connecting Dots বিশেষ সাক্ষাৎকার',
      description: 'নির্বাচন-পরবর্তী রাজনৈতিক পরিস্থিতি নিয়ে বিশেষ সাক্ষাৎকার',
      stream_url: null,
      embed_url: null,
      thumbnail: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=800',
      status: 'upcoming',
      scheduled_at: '2026-03-01T14:00:00.000Z',
      category: 'interview'
    },
    {
      title: 'অর্থনীতি লাইভ: নতুন বাজেট বিশ্লেষণ',
      description: 'নতুন সরকারের প্রথম বাজেট প্রস্তাব নিয়ে সরাসরি আলোচনা',
      stream_url: null,
      embed_url: null,
      thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800',
      status: 'upcoming',
      scheduled_at: '2026-06-15T10:00:00.000Z',
      category: 'economy'
    }
  ];

  const insertStream = db.prepare(`
    INSERT INTO streams (title, description, stream_url, embed_url, thumbnail, status, scheduled_at, category)
    VALUES (@title, @description, @stream_url, @embed_url, @thumbnail, @status, @scheduled_at, @category)
  `);

  const batchStreams = db.transaction(() => {
    for (const stream of streams) insertStream.run(stream);
  });
  batchStreams();
  console.log(`  ✅ ${streams.length}টি স্ট্রিম সিড করা হয়েছে`);

  // ═══════════════════════════════════════════════════
  // SEED SAMPLE COMMENTS
  // ═══════════════════════════════════════════════════
  const comments = [
    { content_type: 'post', content_id: 1, display_name: 'Anonymous', avatar_color: '#6366f1', body: 'খুব তথ্যবহুল পোস্ট! ধন্যবাদ Connecting Dots কে।' },
    { content_type: 'post', content_id: 1, display_name: 'একজন ভোটার', avatar_color: '#22c55e', body: 'নির্বাচন সুষ্ঠু হয়েছে বলে মনে হচ্ছে। জনগণের রায়কে সম্মান জানাই।' },
    { content_type: 'post', content_id: 1, display_name: 'Anonymous', avatar_color: '#f97316', body: 'আশা করি নতুন সরকার দেশের উন্নয়নে কাজ করবে।' },
    { content_type: 'post', content_id: 2, display_name: 'ডেটা সায়েন্টিস্ট', avatar_color: '#3b82f6', body: 'বেইসিয়ান মডেলটি চমৎকার কাজ করেছে! কোন ডেটাসেট ব্যবহার করেছেন?' },
    { content_type: 'post', content_id: 2, display_name: 'Anonymous', avatar_color: '#ec4899', body: 'এআই দিয়ে নির্বাচনী পূর্বাভাস — ভবিষ্যতের পথ এটাই!' },
    { content_type: 'podcast', content_id: 1, display_name: 'শ্রোতা', avatar_color: '#14b8a6', body: 'অসাধারণ পডকাস্ট! আরও পর্ব চাই।' },
    { content_type: 'podcast', content_id: 1, display_name: 'Anonymous', avatar_color: '#f59e0b', body: 'ড. আহমেদের বিশ্লেষণ খুবই সুন্দর ছিল।' },
  ];

  const insertComment = db.prepare(`
    INSERT INTO comments (content_type, content_id, display_name, avatar_color, body)
    VALUES (@content_type, @content_id, @display_name, @avatar_color, @body)
  `);

  const batchComments = db.transaction(() => {
    for (const comment of comments) insertComment.run(comment);
  });
  batchComments();
  console.log(`  ✅ ${comments.length}টি কমেন্ট সিড করা হয়েছে`);

  console.log('🎙️ মিডিয়া কন্টেন্ট সিড সম্পন্ন!');
}

module.exports = { seedMediaData };
