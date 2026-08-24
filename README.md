# Connecting Dot — Professional Podcast Studio Platform

**Powered by SCCG Consulting**

A full-stack professional podcast studio web application for multi-location live podcast production with simultaneous streaming to YouTube, Facebook, and Instagram.

## Tech Stack

### Frontend
- React 18 + Vite + TypeScript
- LiveKit SDK (`@livekit/components-react`, `livekit-client`)
- Fabric.js (canvas overlays)
- Framer Motion (animations)
- Socket.io Client
- CSS Modules + Inline Styles

### Backend
- Node.js + Express + TypeScript
- Socket.io (real-time chunk streaming)
- fluent-ffmpeg (RTMP streaming)
- ngrok (public URL tunneling)
- Anthropic Claude API (AI features)
- LiveKit Server SDK (token generation)

## Project Structure

```
connecting-dot/
├── client/          # React frontend (Vite, port 5173)
├── server/          # Express backend (port 3001)
└── package.json     # Root with concurrently dev script
```

## Getting Started

### 1. Install Dependencies

```bash
npm run install:all
```

### 2. Configure Environment

Copy `server/.env.example` to `server/.env` and fill in your API keys:

- `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` / `LIVEKIT_URL` — from [LiveKit Cloud](https://cloud.livekit.io)
- `ANTHROPIC_API_KEY` — from [Anthropic Console](https://console.anthropic.com)
- `RTMP_YOUTUBE_KEY` / `RTMP_FACEBOOK_KEY` / `RTMP_INSTAGRAM_KEY` — from each platform's live dashboard
- `NGROK_AUTH_TOKEN` — from [ngrok](https://dashboard.ngrok.com)

### 3. Start Development

```bash
npm run dev
```

This starts both the client (http://localhost:5173) and server (http://localhost:3001) concurrently.

## Features

- **Multi-Location Speakers** — Connect hosts and guests from anywhere via LiveKit
- **Live Streaming** — Simultaneous RTMP streaming to YouTube, Facebook, and Instagram
- **Studio Branding** — Professional SCCG-branded studio look with overlays and lower thirds
- **Local Recording** — Record sessions locally as WebM files
- **AI Captions** — Anthropic Claude–powered transcript cleaning and lower-third suggestions
- **Canvas Mixer** — Fabric.js–powered compositing with text overlays, tickers, and logos

## Brand

- **Primary Blue:** #0057A8
- **Dark Blue:** #003875
- **Display Font:** Playfair Display
- **UI Font:** DM Sans

---

## v1.1 — Production Pack (free-tier integrations)

Every integration below is **optional** and the app degrades gracefully when
credentials are absent. Drop a key into `server/.env` to "light up" each
feature without touching code.

| Capability | Free service | Env vars | Endpoints / files |
|---|---|---|---|
| Cloud database (replaces `db.json` transparently) | **Supabase** (500 MB) | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | `server/src/services/db.ts` |
| Persistent + audience chat | (built-in) | — | `POST /api/chat/:roomId`, socket `chat:message` w/ `channel: 'audience' \| 'backstage'` |
| Cloud storage for recordings & exports | **Cloudinary** (25 GB + CDN) | `CLOUDINARY_*` | `POST /api/storage/upload` |
| Server-side transcripts | **Hugging Face Whisper** (free Inference) | `HUGGINGFACE_API_TOKEN` | `POST /api/transcribe` |
| Live captions | Browser **Web Speech API** (no key) | — | `useLiveCaptions`, `CaptionsOverlay` |
| Auto-director (voice-activity scene cuts) | (built-in) | — | `useAutoDirector` |
| YouTube edit / upload / comment | **YouTube Data API v3** (free quota) | `GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI` | `/api/youtube/*`, `YouTubeStudioPanel` |
| Auto social posting | Discord / Slack / Telegram / Zapier / Make webhooks | `DISCORD_WEBHOOK_URL`, `SLACK_WEBHOOK_URL`, `TELEGRAM_BOT_TOKEN`+`TELEGRAM_CHAT_ID`, `GENERIC_WEBHOOK_URL` | `POST /api/social/publish`, `SocialPublisher` |
| Browser post-production (trim/export MP4) | **ffmpeg.wasm** (OSS, runs locally) | — | `/post` page |
| Multi-camera per guest | LiveKit additional publishes | — | `MultiCameraPublisher` |
| Hardening | host-key middleware, CORS allowlist, in-memory rate limiter | `HOST_KEY`, `CORS_ORIGINS` | `server/src/middleware/*` |

### New routes

- `/post` — Post-production editor (trim, export MP4, push to Cloudinary or YouTube)

### Capability discovery

`GET /api/capabilities` returns the live status of every integration so the
UI can hide buttons that aren't wired up yet.

### Setup

```sh
# 1. Copy env templates
cp server/.env.example server/.env
cp client/.env.example client/.env

# 2. Install (note: client adds @ffmpeg/ffmpeg + @ffmpeg/util)
npm run install:all

# 3. Start everything
npm run dev
```

The post-production page requires the dev server's COOP/COEP headers
(automatically set in `client/vite.config.ts`) so `ffmpeg.wasm` can
allocate `SharedArrayBuffer`.

### Auth

All write endpoints (`POST/PUT/DELETE /api/episodes`, `/api/social/publish`,
`/api/youtube/*`, `/api/chat/:room/:id` delete) require the host key in
the `x-host-key` header. The default is `SCCG-STUDIO-2026` — change
`HOST_KEY` for any deployment.

### Supabase tables (only if you set `SUPABASE_URL`)

```sql
create table episodes      (id text primary key, payload jsonb, created_at timestamptz default now());
create table settings      (key text primary key, value jsonb);
create table chat_messages (id text primary key, room_id text, payload jsonb, created_at timestamptz default now());
create table integrations  (key text primary key, value jsonb);
```

---

© 2026 Connecting Dot. Powered by SCCG Consulting.
