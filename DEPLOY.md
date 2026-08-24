# Deployment Guide — Connecting Dot Studio

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

---

## Troubleshooting

| Symptom                                          | Fix                                                                                              |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| `cloudDb: false` after setting the env var       | The base64 string was wrapped — re-run `base64 -w0` (Linux) or paste it on a single line.        |
| CORS error in browser console                    | Add the Firebase Hosting URL to `CORS_ORIGINS` in the server `.env` and `docker compose restart` |
| `/post` fails to load FFmpeg                     | Confirm `Cross-Origin-Embedder-Policy: require-corp` is in the response headers from Firebase    |
| Stream relay drops within seconds                | You're on Cloud Run / Render — switch to Oracle. Spin-down kills WebSockets.                     |
| Oracle "Out of capacity for shape" when creating | Try a different region (Frankfurt, Phoenix). Capacity rotates daily.                             |
