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

## Gotchas

- Media library path `/mnt/media` is hardcoded in `src/server.js` and `scripts/convert-videos.ts`
- Maintenance scripts log to hardcoded `/home/marron/ProjectM/logs/` (differs from this repo path)
- `scripts/extract-subtitles.ts` uses `ffmpeg.exe` and WSL→Windows path conversion (designed to run under WSL)
- `scripts/sync-subtitles.ts` rsyncs over SSH to a hardcoded host (`192.168.5.67`, overridable via `SSH_HOST`)

## To do — known issues (diagnosed 2026-07-22)

### Critical — security

- [ ] Path traversal in `/stream/:id`, `/media/:id`, `/api/tracks/:id` (`src/server.js:113-116`): `normalizeMediaPath()` doesn't sanitize `..`; add a `safeJoin()` that resolves and asserts the result stays under `MEDIA_PATH`
- [ ] Path traversal write in `/api/subtitles/:id` (`src/server.js:726-826`): `?file=` and `?lang=` flow unsanitized into `path.join` + `mkdir` + write; validate `lang` against `/^[a-z]{2,3}$/` and DB-validate `id` for movies too
- [ ] No authentication on any endpoint + wide-open CORS (`app.use(cors())`, line 11): verify Supabase JWT server-side, restrict CORS to the frontend origin

### Critical — build

- [ ] `vite`, `typescript`, `@vitejs/plugin-react` missing from `package.json` **and** lockfile — fresh clone cannot `dev`/`build`; add them to devDependencies
- [ ] `"start:server": "node server.js"` points at a nonexistent root file; fix to `node src/server.js`

### Critical — player

- [ ] Switching audio track permanently breaks the player (`PlayerPage.tsx:269-336`): effect cleanup destroys Plyr but `<video>` never remounts (`containerKey` excludes `selectedAudio`) and `video.load()` is never called

### High

- [ ] `loadContentWithPaths()` rescans the whole library per request (every Range chunk!); add caching with TTL/mtime invalidation (`src/server.js:213-239`)
- [ ] Missing `'error'` handlers crash the process: video read stream (`server.js:362`), ffprobe child (`server.js:289`), `res.download` callback writing after headers sent (`server.js:260-265`)
- [ ] Unauthenticated OpenSubtitles downloads with arbitrary `?lang=` cache keys → quota/disk abuse; gate behind auth + lang whitelist
- [ ] Scraper data loss (`scraper.ts`): poster/metadata use bare numeric TMDB id → `movie-123`/`tv-123` overwrite each other (lines 185/198); corrupt-DB `catch {}` then overwrite (lines 26-31); non-atomic full-DB rewrite per item (line 226); transient network errors permanently blacklist items via `skipped.txt` (lines 228-232)
- [ ] `scripts/convert-videos.ts` data loss: no `-map 0` → drops extra audio/sub tracks; `<basename>.mp4` collisions + `-y` + delete-original-on-success overwrite/destroy files
- [ ] 6,651 `node_modules/` files committed to git; remove from tracking; also gitignore `.env.local` / `.env.*.local`
- [ ] TMDB API key leaks into logs on fetch failure (`scraper.ts:49` includes `?api_key=` in the error URL)
- [ ] `.env.production` defines `API_URL` but `PlayerPage.tsx:39` reads `VITE_URL` → player broken in prod builds; unify env var names + validate at startup
- [ ] Wishlist is dead: `WatchlistProvider` never mounted, `WishlistPage` always empty; mount the provider or delete the feature
- [ ] Auth gates nothing: no route checks `useAuth()`; protect routes or drop the login flow

### Medium

- [ ] Range handling (`server.js:350-363`): clamp `end` to `fileSize-1`, return 416 for invalid/suffix ranges, use per-extension `Content-Type` (not hardcoded `video/mp4`)
- [ ] Route shadowing: `/media/:id` registered before `express.static` (`server.js:241` vs 272) — reorder/reconcile
- [ ] Subtitle matching bugs: unpadded `S1E2` never matches; `NNxNN` filenames unparsed; `(year)` in folder names breaks OpenSubtitles filtering; case-sensitive `.ass`/`.vtt` checks; episode-less sub files served for every episode
- [ ] Fuzzy `matches()` (60% word overlap, first-match-wins) mismatches one-word titles nondeterministically (`server.js:102-111`)
- [ ] Stale subtitle `<track>`s leak into next episode's `<video>` — reset `subtitleTracks`/`audioTracks` in effect cleanup (`PlayerPage.tsx:258-262`)
- [ ] Item-load effect has no race guard or error handling (`PlayerPage.tsx:156-178`)
- [ ] Directional nav `preventDefault()`s all arrow keys before checking focus — breaks page scroll & radio inputs (`useDirectionalNavigation.ts:172-179`)
- [ ] CardsGrid: virtualization range never shrinks → blank grid after category switch; search-after-scroll registers shifted col indices (`CardsGrid.tsx:38-72`)
- [ ] Scripts: hardcoded log path `/home/marron/ProjectM/logs/` doesn't exist (logs silently lost); `extract-subtitles.ts` is WSL-only (`ffmpeg.exe`); shell-injection-prone path interpolation; convert-videos re-encodes already-h264 video lossily (use `-c:v copy` when possible)
- [ ] Relative `href="style.css"` breaks on nested routes (`index.html:7` → `/style.css`); Plyr CSS loaded from CDN instead of the installed npm package
- [ ] No typecheck ever runs (`typescript` not installed, no script); strict-mode errors already exist (e.g. `convert-videos.ts:70-71`)
- [ ] Server `.env` parser reads only `../.env`, ignores real env vars and `.env.production` (`server.js:16-33`) — use `dotenv`

### Low

- [ ] `npm test` placeholder always fails; `"preview"` rebuilds instead of `vite preview`; `"main": "index.js"` nonexistent; unused `jsdom` deps
- [ ] `LoginPage` sends "Username" text field as `email:`; no redirect away from `/login` when authenticated
- [ ] No fetch timeouts (server + frontend); unbounded `episodeNameCache`; OpenSubtitles download tokens logged; JSON errors served as `Content-Type: text/vtt`
- [ ] `parseEpisodeFromPath` fabricates "S1E1" for unmatched files; ASS subtitles fetched twice; `navigate(-1)` back buttons break on direct loads
- [ ] README is empty
