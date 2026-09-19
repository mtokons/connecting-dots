# Deployment Guide — Connecting Dot Studio

## Deployed Release: 2026-09-19

- Frontend deployed to Firebase Hosting: https://connecting-dots-68dcb.web.app
- Backend deployed to Oracle Cloud VM via systemd service: https://92-5-129-88.sslip.io
- The live desk provides one shared person-segmented studio, host-controlled camera
   correction, SCCG logo animation, speaker transitions, lower thirds, a ticker,
   screen sharing and local reference-video playback. It uses 2D person mattes,
   not 3D avatars. Poor focus, missing detail and severe underexposure cannot be
   recovered by these controls. Camera frames is the explicit processing fallback.
- Native browser H.264 capture uses 1080p30 at a requested 8 Mbps, or 720p30 at
   5 Mbps; FFmpeg copies that video without a second lossy encode. Browsers without
   native H.264 capture use VP8 at 720p30 and a server H.264 transcode. Browser
   encoders use variable bitrate, so measured bitrate depends on image complexity.
- Relay health reports measured FFmpeg progress, not confirmed YouTube playback.
   Keep the host tab visible and the device awake. Automatic reconnection does not
   resume a damaged media container; start a fresh broadcast after a connection loss.
- YouTube is selected by default; Facebook is off. An omitted or disabled target
   never falls back to its saved server key. Destination failure ends the broadcast
   visibly instead of silently continuing with a failed selected destination.

### Private publisher pairing

Previously embedded client stream keys and browser key persistence have been
removed. Treat earlier public bundles, chat, configuration output and logs as
credential exposure. Rotate the affected streaming keys, OAuth client secret and
server authentication secret privately before redeployment. Do not paste secrets
into chat or add them to client environment variables.

1. In the intended host browser, open Live Studio, then Publish, and use
    **Copy publisher pairing ID**. This is the hash identifying that browser's
    workspace, not its private workspace token.
2. Set `STUDIO_PUBLISHER_WORKSPACE` in the server's private environment to this
    `workspace:...` identifier. Configure `RTMP_YOUTUBE_KEY` and, if needed,
    `RTMP_FACEBOOK_KEY` privately on the server. Restart only when no jobs are active.
3. Reload the studio. The authorized browser can use saved destinations without
    entering keys. Other browser workspaces cannot use the saved channel keys.
    Clearing browser storage requires pairing again. Only one publisher workspace
    is supported by this environment setting.

The links identify the intended destinations, but an RTMP key is not a verified
channel/Page identity. Confirm the actual destination in YouTube Live Control Room
or Facebook Live Producer. Recorded YouTube uploads retain their separate OAuth
channel-ID verification.

### Verification and assets

```bash
npm --prefix client run test:studio
npm --prefix server run test:video
npm run build
```

The browser suite needs installed Chrome and native FFmpeg/FFprobe. It intercepts
all publishing requests and streams only into local FLV files. It covers both
capture codecs, orderly shutdown, disconnects, destination selection, presentation
sources, canvas graphics and desktop/mobile layout. On macOS, the server rendering
tests may need `FFMPEG_PATH` set to `@ffmpeg-installer/ffmpeg` for drawtext support.

The person model is pinned to MediaPipe selfie_segmenter float16 version 1:
`https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/1/selfie_segmenter.tflite`.
SHA-256: `191ac9529ae506ee0beefa6b2c945a172dab9d07d1e802a290a4e4038226658b`.
It is served from `client/public/models`; Vite bundles the pinned tasks-vision
0.10.14 WASM assets on the same origin. Include both public assets and hashed
build assets in a release. Home, studio, editor and segmentation code are split
into separate chunks.

## Current release: 2026-09-18

- Frontend: https://connecting-dots-68dcb.web.app
- API: https://92-5-129-88.sslip.io
- Backend VM: `ubuntu@92.5.129.88`; use the authorized private key locally,
   never commit it. The current release lives at
   `/home/ubuntu/releases/connecting-dot-20260918-1055`.
- System service: `connecting-dot-api.service`. The API restarts on failure and
   starts on boot. Nginx serves HTTPS and WebSockets directly; the temporary
   `connecting-dot-tunnel.service` has been disabled.
- Persistent data and private configuration remain under `/home/ubuntu/studio`:
   `.env`, `deploy.env`, `studio.db`, and `recordings/`. Do not replace this
   directory with a release archive. The previous application remains there for
   rollback; the new service executes the versioned release's compiled entry point.
- The API hostname resolves directly to the VM through third-party sslip.io DNS.
   It is not a temporary tunnel, but still depends on that DNS service and the
   VM retaining its IP. An owned API subdomain remains preferable. Nginx uses a
   Let's Encrypt certificate; keep the HTTP ACME challenge route and certificate
   renewal enabled. Runtime API configuration is served with `Cache-Control: no-store`.
- `mysccg.de` and `www.mysccg.de` resolve to `46.202.158.70`, not the backend VM.
   The API uses its own Nginx TLS virtual host; no public DNS records were changed.
- YouTube OAuth credentials are configured in `/home/ubuntu/studio/deploy.env`
  with client ID `617762768564-9hlb0g93j277ac8ji7l55e0vcj7nt02c...` and redirect URI
  `https://92-5-129-88.sslip.io/api/youtube/callback`.
- The intended YouTube destination is https://www.youtube.com/@sccg24x7.
- The intended Facebook destination is https://www.facebook.com/mysccg.
- The previous release exposed default stream keys in its client. Follow the
   rotation and private pairing steps above before releasing the updated studio.
- Existing LiveKit configuration was preserved; real broadcasts were not tested.
- Verification: both builds and all nine focused tests passed, including tests
   executed on the Linux VM. Public HTTPS, CORS, workspace checks, and WebSockets
   passed. The hosted browser completed upload, studio render, and 1080p playback;
   synthetic projects were deleted. After replacing the tunnel, normal-DNS HTTPS,
   WebSockets, hosted project creation and live studio entry passed without a DNS
   override. No external YouTube/Facebook broadcast has been verified.

### Fixed publishing destinations: remaining setup

- The new live desk uses server-side stream keys scoped to the paired publisher
   workspace. Do not restore public defaults or browser key persistence.
- The required YouTube channel is https://www.youtube.com/@sccg24x7. During OAuth,
   the backend resolves this handle through the YouTube API and verifies that its
   channel ID matches the authorized account before saving credentials. Unverified
   legacy connections must reconnect. This restriction applies to recorded-video
   uploads, not live RTMP keys, whose channel identity cannot be verified this way.
- The intended Facebook Page is https://www.facebook.com/mysccg. Never send stream
   keys, passwords or access tokens in chat.
- YouTube recorded-video publishing requires `GOOGLE_CLIENT_ID`,
   `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI` configured privately on the
   server. Register the exact callback
   `https://92-5-129-88.sslip.io/api/youtube/callback` with the OAuth client, enable
   the YouTube Data API, and authorize the intended channel in the browser workspace.
   The server retains its refresh token; revoked/expired authorization may require
   reconnecting. A live stream key cannot authorize video uploads.
- Facebook recorded-video publishing is not implemented. It needs a Meta app,
   Page authorization, the relevant approved permissions and a Page-specific upload
   integration. Saving a Facebook live key does not implement that integration.
- Do not make shared channel credentials usable by every anonymous visitor. Keep
   publishing scoped to authorized workspaces; team-device sharing needs a private
   invitation mechanism. No application login is necessary for the current workspace
   flow, but Google/Meta authorization cannot be skipped.

Check service health without printing credentials:

```bash
sudo -n systemctl status connecting-dot-api nginx --no-pager
curl --fail http://127.0.0.1:3001/health
```

The guide below describes general hosting alternatives, not the current VM's
exact service layout.

Zero-cost production deployment using only **Always-Free** tiers:

| Layer            | Service                                | Always-Free quota                          |
| ---------------- | -------------------------------------- | ------------------------------------------ |
| Frontend hosting | **Firebase Hosting**                   | 10 GB storage / 360 MB·day egress          |
| Database         | **Cloud Firestore**                    | 1 GB storage / 50K reads / 20K writes /day |
| Backend (API)    | **Oracle Cloud Always-Free Ampere VM** | 4 vCPU + 24 GB RAM, never sleeps           |
| WebRTC media     | **LiveKit Cloud**                      | 50 GB egress / month                       |
| LLM              | **Anthropic**                          | Free trial credits                         |

> **Why Oracle, not Cloud Run?** Cloud Run scales to zero, which kills active
> WebSocket / FFmpeg streams. Oracle Ampere VMs run 24/7 forever at no cost.

---

## 0. One-time prerequisites

```bash
npm install -g firebase-tools
firebase login
```

Create three accounts (all free):

1. **Firebase** — <https://console.firebase.google.com> → "Add project"
2. **LiveKit Cloud** — <https://cloud.livekit.io> → "New Project" → copy `URL`, `API Key`, `API Secret`
3. **Oracle Cloud** — <https://signup.cloud.oracle.com> → request the free tier
   (verification can take 24–48 h; pick "Ashburn" or "Frankfurt" for Ampere capacity)

---

## 1. Firebase: hosting + Firestore

From the repo root:

```bash
cd client
firebase use --add                    # pick the project you just created
firebase deploy --only firestore:rules,firestore:indexes
```

Edit `client/.env.production` and set `VITE_API_BASE` to your Oracle VM URL
(see step 3) and `VITE_LIVEKIT_URL` to your LiveKit project URL.

```bash
npm run build                         # produces client/dist
firebase deploy --only hosting
# → site is live at https://<project-id>.web.app
```

> The Firebase Hosting headers in `client/firebase.json` already set
> `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy:
> require-corp`, which the post-production page (`/post`) needs for
> `ffmpeg.wasm` to load.

---

## 2. Generate a Firebase service account for the backend

Firebase Console → **Project settings → Service accounts → Generate new private key**.
You get a JSON file. Convert it to a single base64 line so it fits in a `.env`:

```bash
base64 -w0 path/to/serviceAccount.json   # Linux
base64 path/to/serviceAccount.json       # macOS (use the entire blob)
```

Copy the result — you'll paste it as `FIREBASE_SERVICE_ACCOUNT_JSON` in step 3.

---

## 3. Backend: Oracle Cloud Always-Free VM

**Provision the VM**

1. OCI Console → **Compute → Instances → Create instance**
2. Image: **Canonical Ubuntu 22.04** · Shape: **VM.Standard.A1.Flex** (Ampere)
3. Allocate **4 OCPU + 24 GB RAM** (the full free quota in one box)
4. Networking → "Assign a public IPv4 address"
5. After it boots: **Subnet → Security List → Add Ingress Rule**
   - Source `0.0.0.0/0`, Protocol TCP, Port `3001` (and `80`/`443` if you add a reverse proxy)
6. SSH in:

```bash
ssh -i ~/.ssh/your-key ubuntu@<public-ip>
```

**Install Docker + open the host firewall**

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER && newgrp docker
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 3001 -j ACCEPT
sudo netfilter-persistent save
```

**Deploy the server**

```bash
git clone <your-repo-url> connecting-dot
cd connecting-dot/server
cp .env.example .env
nano .env   # paste real values for: LIVEKIT_API_KEY, LIVEKIT_API_SECRET,
            # ANTHROPIC_API_KEY, FIREBASE_SERVICE_ACCOUNT_JSON, HOST_KEY,
            # CORS_ORIGINS=https://<project-id>.web.app
docker compose up -d --build
docker compose logs -f api
```

Health check: `curl http://<public-ip>:3001/health` → `{"status":"ok",...}`.
Capabilities: `curl http://<public-ip>:3001/api/capabilities` should show
`"cloudDb": true` once the Firebase service account is loaded.

**Optional — HTTPS via Caddy** (recommended for production browsers):

```bash
sudo apt install -y caddy
sudo tee /etc/caddy/Caddyfile <<EOF
api.your-domain.example {
  reverse_proxy localhost:3001
}
EOF
sudo systemctl restart caddy
```

Then point `client/.env.production`'s `VITE_API_BASE` at
`https://api.your-domain.example`, rebuild, and redeploy the frontend.

---

## 4. LiveKit Cloud

In <https://cloud.livekit.io> → your project → **Settings**:

- Copy `URL` → `VITE_LIVEKIT_URL` (frontend) **and** `LIVEKIT_URL` (server `.env`)
- Copy `API Key` → `LIVEKIT_API_KEY`
- Copy `API Secret` → `LIVEKIT_API_SECRET`

Restart the server container: `docker compose restart api`.

---

## 5. Verify

```bash
# Frontend
open https://<project-id>.web.app

# Backend
curl https://api.your-domain.example/health
curl https://api.your-domain.example/api/capabilities
```

Expected: every capability you configured returns `true`; visiting the studio
URL connects to LiveKit and chat persists across reloads (Firestore).

---

## Updating after the first deploy

```bash
# Frontend changes
npm run deploy:hosting        # from repo root

# Backend changes
ssh ubuntu@<public-ip>
cd connecting-dot && git pull && cd server && docker compose up -d --build
```

## Account-free production workflow

The home screen has two entries: upload a recording or start a live event. Both
offer Podcast, Interview, Newsroom, and Focus studios. There is no application
login, registration, or admin dashboard in this workflow. Old account URLs return
home, and the account API is no longer mounted.

Recording entry creates a temporary project directly. Live entry opens camera
and microphone setup, then the studio. Going live is a separate explicit action
and requires a destination stream key. Solo hosting works without LiveKit;
remote guests require working LiveKit configuration. Guest invites open the
studio directly, without an admin-created episode.

The relay accepts supported platform keys only, not arbitrary RTMP server URLs.
It allows one broadcast per server, isolates it to its browser workspace, and
stops it after two hours or when its transmitting socket disconnects. Recording
the live session is optional and off by default. Test real destination delivery
with your platform before a production event; local relay startup is not proof
that the destination is receiving video.

## Video editor render-engine checks

The `/edit` page supports temporary video projects, QR phone transfers, saved
scene cuts, 16:9/9:16 exports, clean/studio-backdrop frames, timed text with fades,
voice cleanup, rendered previews, and direct YouTube uploads. `/post` links to it.
`/upload` is the mobile transfer page. Deploy both frontend and backend together.

### Access and temporary storage

- A random 256-bit browser workspace capability is created automatically and
   stored as `cd_workspace` in local storage. Project and channel APIs require it,
   but visitors never see a login form. Workspaces cannot access each other's
   projects or YouTube credentials. Treat this capability as a secret.
- Clearing browser storage or using another browser loses workspace access.
   There is no account recovery or cross-device workspace synchronization. Do not
   use a shared browser profile for private projects or channel connections.
- The phone does not need an account: a QR link grants upload-only access to one
   project for one hour. Generate a fresh link to revoke the previous link.
- YouTube connections belong to the current workspace. Existing legacy global
   channel credentials are not inherited. Google authorization remains necessary
   for uploading to a channel; it is not an application account/login step.
- Before public deployment, configure perimeter rate limits and resource
   monitoring. Account-free access does not prevent quota exhaustion or abuse;
   the global limits below bound resources but do not guarantee availability.
- Each source is limited to 1 GB and two hours; transfers use 8 MB chunks and can
   resume by selecting the same file again. Keep the phone browser in the foreground.
- Four temporary projects are allowed per server, two concurrent incoming chunks,
   and one render or publishing job at a time. Run a single API instance against
   this scratch directory; this implementation is not a distributed job queue.
- Source files, renders, and text assets live in `recordings/_editor`, or the
   directory configured by `VIDEO_SCRATCH_DIR`. Do not serve that directory publicly.
- Projects expire after 24 hours. Completed jobs renew that window. A five-minute
   sweeper and startup recovery remove expired projects; active jobs are protected.
- Confirmed YouTube uploads immediately remove source/render/text files. Only a
   small project receipt remains until expiry. Failed uploads retain files for retry.
- Rendering is limited to a 2 GB output and checks for truncation. Disk-space
   checks reserve room for a render. Memory is bounded, not zero; FFmpeg still uses
   CPU and RAM. The browser does not load full videos into WebAssembly memory.
- Keep the original on the phone. Temporary files are not a backup. Existing
   legacy studio recordings are not deleted by this new cleanup worker.

### Publishing and limitations

Connect the channel through Google OAuth, then refresh its status in the editor.
Review the rendered file, set title, audience, and visibility, and explicitly
confirm publishing. Visibility defaults to private. The new workflow streams
8 MB ranges from disk through YouTube's resumable API and recovers acknowledged
offsets after transient failures. `/post` redirects to the new editor.
Use Disconnect channel when finished on a shared machine. Configure
`GOOGLE_REDIRECT_URI` as your API's `/api/youtube/callback` URL; OAuth state binds
the callback to its initiating workspace and expires after ten minutes.

After a server restart during publishing, check YouTube Studio before retrying:
resumable session URLs are not persisted, so automatic cross-restart resumption
and exactly-once publishing are not guaranteed. API quota, OAuth configuration,
and Google's project verification restrictions still apply. API acceptance does
not guarantee YouTube processing succeeds; keep your original recording.

Studio frames composite the selected bitmap behind aspect-preserved footage;
clean frames use padding. Assets are packaged in `server/assets/studios` and can
be overridden with `VIDEO_STUDIO_ASSETS`. Automatic
subject cropping, multi-file timelines, logos, automatic captions, advanced
animations, and real-time processed-audio preview are not included. Text timing
uses edited-video seconds; adjust it after changing cuts. The actual rendered
preview includes text animation and voice processing. The -14 LUFS loudness
setting is a practical target, not a mandatory YouTube specification or a
guarantee for every recording. No voice filter can repair every damaged recording.

It requires FFmpeg with `drawtext`, `libx264`, and audio filters, plus FFprobe.
The Docker image installs FFmpeg and DejaVu fonts. Override `FFMPEG_PATH`,
`FFPROBE_PATH`, or `VIDEO_FONT_PATH` when using custom installations.

Run the focused tests from `server/`:

```bash
npm run test:video
npm run build
```

On macOS, if system FFmpeg lacks `drawtext`, use the existing bundled binary:

```bash
FFMPEG_PATH="$(node -p 'require("@ffmpeg-installer/ffmpeg").path')" \
   npm run test:video
```

Tests generate short synthetic footage, render both orientations, and remove
their temporary files. The default macOS font is Arial; Linux uses DejaVu Sans.
Always run the root `npm run build` before deploying the complete application.

For local UI development, run the API on port 3001, then run
`VITE_API_BASE='' npm run dev -- --port 5174` inside `client/`. This explicit
development override uses Vite's API/WebSocket proxy and ignores the production
runtime API configuration. Open `http://localhost:5174/`. Actual phone
transfers need a reachable HTTPS origin; a localhost QR link only works on the
machine running the browser. Use a stable production API hostname, not an expired
temporary tunnel. Keep a strong `AUTH_SECRET` for legacy protected endpoints;
application visitors do not need admin credentials.

---

## Troubleshooting

| Symptom                                          | Fix                                                                                              |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| `cloudDb: false` after setting the env var       | The base64 string was wrapped — re-run `base64 -w0` (Linux) or paste it on a single line.        |
| CORS error in browser console                    | Add the Firebase Hosting URL to `CORS_ORIGINS` in the server `.env` and `docker compose restart` |
| `/post` fails to load FFmpeg                     | Confirm `Cross-Origin-Embedder-Policy: require-corp` is in the response headers from Firebase    |
| Stream relay drops within seconds                | You're on Cloud Run / Render — switch to Oracle. Spin-down kills WebSockets.                     |
| Oracle "Out of capacity for shape" when creating | Try a different region (Frankfurt, Phoenix). Capacity rotates daily.                             |
