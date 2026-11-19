# AGENTS.md — ProjectM ("MaxFlix")

Homelab Netflix-style streaming app for a single household. A React SPA browses
a TMDB-scraped catalog; an Express backend serves the local media library at
`/mnt/media` and fetches subtitles from OpenSubtitles (TMDB episode names are
used internally to filter subtitle matches).

## Stack

- **Frontend**: React 19, TypeScript (strict), Vite, react-router-dom 7, Plyr
  (player), assjs (ASS subtitle rendering), fuse.js (fuzzy search)
- **Backend**: Node ESM, Express 5 (`src/server.js`, port 3000)
- **Tooling**: tsx (scripts), ffmpeg/ffprobe (system-installed)
- ESM everywhere (`"type": "module"`). No test suite, no linter.

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Vite dev server (frontend only) |
| `npm run build` | Production build to `dist/` |
| `npm run start:server` | Express media/API server |
| `npm run scrape:db` | TMDB scraper → `content-info/contentDB.json` + posters |
| `npm run convert:videos` | ffmpeg transcode of non-browser-playable files in `/mnt/media` |
| `npm run extract:sub` | Extract embedded subs from MKV (text → VTT, ASS copied, PGS → OCR) |
| `npm run deploy` | `npm run build` + rsync `dist/` to the server |
| `npx tsc --noEmit` | Typecheck (no npm script for it) |

## How it runs

Two processes must run together: the Vite dev server and the Express API. The
SPA fetches the catalog via `VITE_API_URL` and builds stream/subtitle URLs from
`VITE_URL`; Vite bakes both into the production bundle at build time, so
changing them requires a rebuild.

There is **no authentication**: the API answers anyone who can reach port 3000
(CORS is limited to the frontend origin, but direct LAN requests bypass that),
and the SPA has no login flow. This is the intended state for now — do not add
route guards or partial auth checks on your own; the auth system will be
designed as a whole later.

The wishlist is device-local: `WatchlistProvider` persists it to
`localStorage`, per browser.

## Structure

- `index.tsx` / `index.html` / `style.css` — Vite entry, global styles
- `config.ts` — shared `ContentItem` interface + `loadContentDB()`
- `src/components/` — the whole SPA; routes defined in `App.tsx`
  - Pages: `HomePage`, `CategoryPage`, `WishlistPage`, `PlayerPage`
  - Shared UI: `NavBar`, `Card`, `CardsGrid`, `PreviewModal`
  - Providers: `ContentProvider` (catalog fetched once per session),
    `WatchlistProvider` (localStorage wishlist, `useWishlist()` hook)
- `src/env.d.ts` — `import.meta.env` typings + hand-declared Plyr module
- `src/server.js` — Express backend:
  - `GET /api/content-availability` — catalog matched against `/mnt/media`
  - `GET /stream/:id` — video streaming with HTTP Range support
  - `GET /api/subtitles/:id` — cached VTT/ASS, falls back to OpenSubtitles
    (SRT→VTT conversion, cache in `subs/` next to the video)
  - `GET /api/subtitles-available/:id` — subtitle inventory for the player
  - `GET /api/tracks/:id` — ffprobe audio tracks (not currently used by the SPA)
  - `/media/*` — static file serving
- `hooks/useDirectionalNavigation.ts` — TV-remote-style arrow-key grid
  navigation (used by the nav bar and card grids)
- `scraper.ts` — TMDB scraper (top-rated + recent discovery), writes
  `content-info/`
- `scripts/` — media maintenance, run with tsx: `convert-videos.ts`,
  `extract-subtitles.ts`, `sync-subtitles.ts`
- `content-info/` — generated data: `contentDB.json`, `poster/`, `metadata/`,
  `skipped.txt`

## Conventions

- TypeScript strict mode; 4-space indentation — match the style of the file
  you are editing
- Content IDs are prefixed: `movie-<tmdbId>` / `tv-<tmdbId>`
- Subtitle cache files follow `<SxxEyy_>?<lang><_streamIdx>?(_ext)?.(vtt|ass)`
  inside `subs/` or `Subs/` dirs next to the video
- Episode detection relies on `SxxEyy` (or `NNxNN`) patterns in filenames

## Environment & secrets (never commit)

- `.env` / `.env.production`: `VITE_API_URL`, `VITE_URL`,
  `OPENSUBTITLES_API_KEY`, `TMDB_API_KEY`, `OMDB_API_KEY`. `.env.production`
  also defines `API_URL`, which nothing reads.

## Deployment

The frontend is served statically from `/home/marron/ProjectM/dist` on
`marron@192.168.5.67` (port 80); the Express API runs on the same host, port
3000. To ship frontend changes, **build first** — the server only serves the
built bundle, never the TS source:

```bash
npm run deploy  # builds dist/ and rsyncs it (with --delete) to the server
```

SSH is key-based, so the deploy is non-interactive. The script does **not**
restart the Express server.

## Intentional homelab coupling — do not refactor

This is a single-machine deployment, not a portable product. The hardcoding
below is deliberate; do not "fix" it:

- Media library path `/mnt/media` is hardcoded in `src/server.js` and
  `scripts/convert-videos.ts`
- Maintenance scripts log to `/home/marron/ProjectM/logs/`
- `scripts/extract-subtitles.ts` targets WSL on purpose: it calls `ffmpeg.exe`,
  converts WSL↔Windows paths, and OCRs PGS tracks via repo-local (gitignored)
  tooling — `pgsrip` in `.venv/` + tesseract 4.1.1 in `.tools/` (the
  `.tools/bin/tesseract` wrapper sets `LD_LIBRARY_PATH`/`TESSDATA_PREFIX`).
  Only `eng.traineddata` is installed; pgsrip needs the language as a 2-letter
  code in the temp `.sup` filename (3-letter codes hit a path-translation bug)
- `scripts/sync-subtitles.ts` rsyncs over SSH to host `192.168.5.67`
  (override: `SSH_HOST`)
- The server reads config only from `../.env` via a hand-rolled parser — real
  environment variables and `.env.production` are not honored
- No on-the-fly transcoding: `/stream/:id` always serves the original file
  as-is; browser compatibility is handled offline by
  `scripts/convert-videos.ts`, and subtitles are a separate layer (extraction
  scripts + SRT→VTT conversion + ASS via assjs)
