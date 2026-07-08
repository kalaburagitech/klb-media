# KLB Media Platform

Production-grade media storage and delivery built on **Cloudflare R2**, **Convex**, and **FFmpeg transcoding**.

## Architecture

```
┌─────────────┐     presigned PUT      ┌──────────────────┐
│   Client    │ ─────────────────────► │  Cloudflare R2   │
│  (Next.js)  │                        │  bucket: klbmedia│
└──────┬──────┘                        └────────▲─────────┘
       │                                        │
       │ init / complete                        │ variants + HLS
       ▼                                        │
┌─────────────┐     dispatch job         ┌──────┴───────────┐
│   Convex    │ ─────────────────────► │ FFmpeg Transcoder│
│  (metadata) │ ◄──── webhook callback ──│   (Node service) │
└──────┬──────┘                          └──────────────────┘
       │
       ▼
┌─────────────┐
│ CF Worker   │  GET /cdn/{key} — edge delivery, Range requests, cache headers
└─────────────┘
```

### Output formats

| Type | Default (TRANSCODING_ENABLED=false) | When transcoding enabled (video only) |
|------|-------------------------------------|---------------------------------------|
| Images | Original only | Original only |
| PDF / docs | Original only | Original only |
| Audio | Original only | Original only |
| Video | Original only | MP4 variants + HLS |

### Storage mode (10 GB free tier)

By default **`TRANSCODING_ENABLED=false`** — every upload stores **one file in R2** (original only).  
This keeps you within the 10 GB free tier for images, PDFs, and audio.

When you need streaming later:

```bash
npx convex env set TRANSCODING_ENABLED true
npx convex env set TRANSCODER_URL http://localhost:8787
npm run dev:transcoder
```

Only **video** files will be transcoded. Images/audio/PDF always stay original-only.

## Quick start

### 1. Configure R2 credentials

Copy values from `frontend/r2credentials.md` into environment files (never commit secrets):

```bash
# Convex environment
cd frontend
npx convex env set R2_ACCOUNT_ID 189e3e8d6addc8e9f82fb255d831fddb
npx convex env set R2_ACCESS_KEY_ID your_key
npx convex env set R2_SECRET_ACCESS_KEY your_secret
npx convex env set R2_BUCKET klbmedia
npx convex env set TRANSCODING_ENABLED false
```

### 2. Start services

```bash
npm run install:all

# Terminal 1 — Convex + Next.js
cd frontend && npx convex dev   # in one terminal
cd frontend && npm run dev      # in another

# Terminal 2 — Transcoder (requires ffmpeg)
cp services/transcoder/.env.example services/transcoder/.env
# edit .env with R2 credentials
npm run dev:transcoder

# Terminal 3 — Cloudflare Worker (optional CDN layer)
cp workers/media-api/.dev.vars.example workers/media-api/.dev.vars
npm run dev:worker
```

### 3. Upload flow

1. `POST /api/upload/init` → get presigned URL + `mediaId`
2. `PUT` file to presigned URL (direct to R2)
3. `POST /api/upload/complete` → triggers transcoding
4. Poll `GET /api/media/{id}?format=json` until `status: ready`

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/media` | List media |
| GET | `/api/media/{id}` | Redirect to CDN URL |
| GET | `/api/media/{id}?format=json` | Metadata + variants |
| POST | `/api/upload/init` | Presigned upload |
| POST | `/api/upload/complete` | Start processing |
| POST | `/api/upload` | Direct upload (small files) |
| GET | `/cdn/{r2Key}` | Worker edge delivery |

## Project structure

```
frontend/          Next.js dashboard + Convex backend
workers/media-api/ Cloudflare Worker CDN + API proxy
services/transcoder/ FFmpeg processing service
```
