# syntax=docker/dockerfile:1.6
# ─────────────────────────────────────────────────────────────
# Connecting Dot Studio — server image
# Multi-stage build:
#   1. builder  — installs all deps + compiles TypeScript
#   2. runtime  — slim image with FFmpeg + production deps only
#
# Designed for Oracle Cloud Always-Free Ampere VMs (linux/arm64).
# Also runs unchanged on linux/amd64 (Cloud Run, Fly.io, etc.).
# ─────────────────────────────────────────────────────────────

# ── 1. Builder ───────────────────────────────────────────────
FROM node:20-bookworm-slim AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Trim to production deps only — copied verbatim into runtime stage.
RUN npm prune --omit=dev

# ── 2. Runtime ───────────────────────────────────────────────
FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3001

# FFmpeg is required by /api/stream RTMP relay.
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg ca-certificates curl && \
    rm -rf /var/lib/apt/lists/*

# Non-root user — never run a public-facing Node process as root.
RUN groupadd -r app && useradd -r -g app -d /app app && \
    mkdir -p /app/recordings && chown -R app:app /app

COPY --from=builder --chown=app:app /app/node_modules ./node_modules
COPY --from=builder --chown=app:app /app/dist ./dist
COPY --chown=app:app package*.json ./
COPY --chown=app:app src/db.json ./src/db.json

USER app
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -fsS http://127.0.0.1:${PORT}/health || exit 1

CMD ["node", "dist/index.js"]
