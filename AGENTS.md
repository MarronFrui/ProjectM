# AGENTS.md — ProjectM ("MaxFlix" / homemade-netflix)

Personal Netflix-like streaming app. React frontend + Express backend that serves a
local media library (`/mnt/media`), with TMDB-sourced metadata and subtitles from
OpenSubtitles.

## Stack

- **Frontend**: React 19, TypeScript, Vite, react-router-dom 7, Plyr (player), assjs (ASS subtitles), fuse.js (search), Supabase (auth)
- **Backend**: Node ESM, Express 5 (`src/server.js`, port 3000)
- **Scripts**: tsx, ffmpeg/ffprobe (must be installed on the system)
- Module system: ESM everywhere (`"type": "module"`)

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Vite dev server (frontend) |
| `npm run build` | Production build to `dist/` |
| `npm run start:server` | Express media/API server (`node server.js` — see note below) |
| `npm run scrape:db` | TMDB scraper: builds `content-info/contentDB.json` + posters |
| `npm run convert:videos` | Transcode non-browser-compatible videos in `/mnt/media` via ffmpeg |
| `npm run extract:sub` | Extract embedded subtitles from MKV files |

Note: `start:server` runs `node server.js` but the server lives at `src/server.js`
(run `node src/server.js` from the repo root). Both the dev frontend and the server
must run together (frontend calls the API via `VITE_API_URL` / `VITE_URL`).

There are **no tests** (`npm test` is a placeholder) and no linter configured.

## Structure

- `index.tsx`, `index.html`, `style.css` — Vite entry, global styles
- `config.ts` — shared `ContentItem` interface + `loadContentDB()` (fetches `/api/content-availability`)
- `src/components/` — all React components/pages; routes defined in `App.tsx`
  - Pages: `HomePage`, `CategoryPage`, `WishlistPage`, `PlayerPage`, `LoginPage`
  - Providers: `AuthProvider` (Supabase), `WatchlistProvider`
- `src/server.js` — Express backend:
  - `GET /api/content-availability` — DB items matched against `/mnt/media` folders
  - `GET /stream/:id` — video streaming with HTTP range support
  - `GET /api/subtitles/:id` — serves cached VTT/ASS, falls back to OpenSubtitles (converts SRT→VTT, caches to `subs/` next to the video)
  - `GET /api/subtitles-available/:id`, `GET /api/tracks/:id` (ffprobe audio tracks)
  - `/media/*` — static file serving
- `src/supabase.ts` — Supabase client (env-driven)
- `hooks/useDirectionalNavigation.ts` — TV/remote-style arrow-key navigation
- `scraper.ts` — TMDB scraper (top-rated then recent discovery); writes `content-info/`
- `scripts/` — media maintenance scripts (run with tsx)
- `content-info/` — generated data: `contentDB.json`, `poster/`, `metadata/`, `skipped.txt`

## Conventions

- TypeScript strict mode; 4-space indentation in existing components — match the style of the file you edit
- Content IDs are prefixed: `movie-<tmdbId>` / `tv-<tmdbId>`
- Subtitle cache files follow `<SxxEyy_>?<lang><_streamIdx>?<_ext)?.(vtt|ass)` inside `subs/` or `Subs/` dirs next to videos
- Episode detection relies on `SxxEyy` (or `NNxNN`) patterns in filenames

## Environment & secrets (never commit)

- `.env` / `.env.production`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL`, `VITE_URL`, `OPENSUBTITLES_API_KEY`
- `apikey.json`: TMDB key (`{"API_KEY": "..."}`) — used by `scraper.ts` and `src/server.js`
- `apikeyOMDb.json`: OMDb key

## Gotchas — intended homelab coupling

This is a single-machine homelab deployment, not a portable product. The hardcoded
paths/hosts/toolchain below are **intentional** — do not refactor them for
portability or "fix" them as if they were bugs:

- Media library path `/mnt/media` is hardcoded in `src/server.js` and `scripts/convert-videos.ts`
- Maintenance scripts log to `/home/marron/ProjectM/logs/` (intended; just ensure the dir exists)
- `scripts/extract-subtitles.ts` uses `ffmpeg.exe` and WSL→Windows path conversion (designed to run under WSL)
- `scripts/sync-subtitles.ts` rsyncs over SSH to host `192.168.5.67` (overridable via `SSH_HOST`)
- Server reads config only from `../.env` via a hand-rolled parser (fine while that file exists)
- No on-the-fly transcoding: `/stream/:id` always serves the **original** file as-is (browser compatibility is handled offline by `scripts/convert-videos.ts`); subtitles are a separate layer (extraction scripts + SRT→VTT conversion + ASS via assjs)

## To do — known issues (diagnosed 2026-07-22)

### Critical — security

- [x] ~~Path traversal in `/stream/:id`, `/media/:id`, `/api/tracks/:id`~~ — fixed 2026-07-22: `safeJoin()` rejects paths escaping `MEDIA_PATH` (residual: symlinks inside `/mnt/media` pointing outside are not detected)
- [x] ~~Path traversal write in `/api/subtitles/:id`~~ — fixed 2026-07-22: subs dirs go through `safeJoin()`, `lang` whitelisted to `/^[a-z]{2,3}$/`, `id` validated as `movie|tv-<digits>`
- [ ] No authentication on any endpoint: verify Supabase JWT server-side (CORS restricted to frontend origin 2026-07-22; remaining hole = anyone who can reach port 3000 directly, e.g. LAN/curl)

### Critical — build

- [ ] `vite`, `typescript`, `@vitejs/plugin-react` missing from `package.json` **and** lockfile — fresh clone cannot `dev`/`build`; add them to devDependencies
- [ ] `"start:server": "node server.js"` points at a nonexistent root file; fix to `node src/server.js`

### High

- [ ] `loadContentWithPaths()` rescans the whole library per request (every Range chunk!); add caching with TTL/mtime invalidation (`src/server.js:213-239`)
- [x] ~~Missing `'error'` handlers crash the process~~ — fixed 2026-07-22: video read stream, ffprobe child, and `res.download` callback all guarded (plus stream destroy on client disconnect)
- [ ] Unauthenticated OpenSubtitles downloads → quota abuse; gate behind auth (lang whitelist in place since 2026-07-22, so cache-key spray is limited to ~17k valid codes)
- [ ] Scraper data loss (`scraper.ts`): poster/metadata use bare numeric TMDB id → `movie-123`/`tv-123` overwrite each other (lines 185/198); corrupt-DB `catch {}` then overwrite (lines 26-31); non-atomic full-DB rewrite per item (line 226); transient network errors permanently blacklist items via `skipped.txt` (lines 228-232)
- [ ] `scripts/convert-videos.ts` data loss: no `-map 0` → drops extra audio/sub tracks; `<basename>.mp4` collisions + `-y` + delete-original-on-success overwrite/destroy files
- [x] 6,651 `node_modules/` files committed to git — untracked 2026-07-22 (still present in old history commits)
- [ ] Add `.env.local` / `.env.*.local` to `.gitignore`
- [ ] TMDB API key leaks into logs on fetch failure (`scraper.ts:49` includes `?api_key=` in the error URL)
- [ ] `.env.production` defines `API_URL` but `PlayerPage.tsx:39` reads `VITE_URL` → player broken in prod builds; unify env var names + validate at startup
- [ ] Wishlist is dead: `WatchlistProvider` never mounted, `WishlistPage` always empty; mount the provider or delete the feature
- [ ] Auth gates nothing: no route checks `useAuth()`; protect routes or drop the login flow

### Medium

- [ ] Audio-track selection is **dropped** but the code is still live and must be stripped: `PlayerPage.tsx` keeps `selectedAudio` state, renders the audio menu (lines 430-450) and appends `?audio=N` to the stream URL — which the server **ignores** (`/stream/:id` never reads it; the original file streams as-is, so the browser always plays the default audio track). Switching tracks also destroys Plyr without recreating it. Remove the menu/state/param (optionally keep `/api/tracks/:id` ffprobe listing for a future remux-based implementation)
- [ ] Range handling (`server.js:350-363`): clamp `end` to `fileSize-1`, return 416 for invalid/suffix ranges, use per-extension `Content-Type` (not hardcoded `video/mp4`)
- [ ] Route shadowing: `/media/:id` registered before `express.static` (`server.js:241` vs 272) — reorder/reconcile
- [ ] Subtitle matching bugs: ~~unpadded `S1E2` never matches~~ — fixed 2026-07-26: sub-file ↔ video episode comparison now goes through `normalizeEpisodeId()` (numeric, padding-insensitive) and `SxxEyy` regexes accept 3-digit episodes (`S01E001`) in `server.js`, `PlayerPage.tsx`, `extract-subtitles.ts`. Remaining: `NNxNN` filenames unparsed; `(year)` in folder names breaks OpenSubtitles filtering; case-sensitive `.ass`/`.vtt` checks; episode-less sub files served for every episode. Note: PGS (`hdmv_pgs_subtitle`) tracks can't be extracted by `extract-subtitles.ts` (bitmap, needs OCR) — e.g. the Judas HxH 2011 release on `F:\Movies`
- [ ] Fuzzy `matches()` (60% word overlap, first-match-wins) mismatches one-word titles nondeterministically (`server.js:102-111`)
- [ ] Stale subtitle `<track>`s leak into next episode's `<video>` — reset `subtitleTracks`/`audioTracks` in effect cleanup (`PlayerPage.tsx:258-262`)
- [ ] Item-load effect has no race guard or error handling (`PlayerPage.tsx:156-178`)
- [ ] Directional nav `preventDefault()`s all arrow keys before checking focus — breaks page scroll & radio inputs (`useDirectionalNavigation.ts:172-179`)
- [ ] CardsGrid: virtualization range never shrinks → blank grid after category switch; search-after-scroll registers shifted col indices (`CardsGrid.tsx:38-72`)
- [ ] Scripts: shell-injection-prone path interpolation (`extract-subtitles.ts:97,205,212`, `sync-subtitles.ts:82,105`, `convert-videos.ts:58-60`); convert-videos re-encodes already-h264 video lossily (use `-c:v copy` when possible)
- [ ] Relative `href="style.css"` breaks on nested routes (`index.html:7` → `/style.css`); Plyr CSS loaded from CDN instead of the installed npm package
- [ ] No typecheck ever runs (`typescript` not installed, no script); strict-mode errors already exist (e.g. `convert-videos.ts:70-71`)

### Low

- [ ] `npm test` placeholder always fails; `"preview"` rebuilds instead of `vite preview`; `"main": "index.js"` nonexistent; unused `jsdom` deps
- [ ] `LoginPage` sends "Username" text field as `email:`; no redirect away from `/login` when authenticated
- [ ] No fetch timeouts (server + frontend); unbounded `episodeNameCache`; OpenSubtitles download tokens logged; JSON errors served as `Content-Type: text/vtt`
- [ ] `parseEpisodeFromPath` fabricates "S1E1" for unmatched files; ASS subtitles fetched twice; `navigate(-1)` back buttons break on direct loads
- [ ] README is empty
- [ ] Optional: replace hand-rolled `.env` parser (`server.js:16-33`) with `dotenv` so real env vars and `.env.production` are honored — homelab `.env` file works fine as-is
