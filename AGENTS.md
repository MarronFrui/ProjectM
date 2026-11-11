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
| `npm run start:server` | Express media/API server (`node src/server.js`) |
| `npm run scrape:db` | TMDB scraper: builds `content-info/contentDB.json` + posters |
| `npm run convert:videos` | Transcode non-browser-compatible videos in `/mnt/media` via ffmpeg |
| `npm run extract:sub` | Extract embedded subtitles from MKV files (text → VTT, ASS copied, PGS bitmap → OCR) |

Both the dev frontend and the server must run together (frontend calls the API via
`VITE_API_URL` / `VITE_URL`).

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

## Deployment (server: 192.168.5.67)

The frontend is served statically from `/home/marron/ProjectM/dist` on
`marron@192.168.5.67` (port 80; the Express API runs on port 3000). To deploy
frontend changes, **build first** — the server only serves the built bundle,
never the TS source:

```bash
npm run deploy  # builds dist/ and rsyncs it to the server
```

This runs `npm run build` (vite bakes `VITE_URL`/`VITE_API_URL` from `.env` into
the bundle) and then `rsync -av --delete dist/ marron@192.168.5.67:/home/marron/ProjectM/dist/`.

SSH is configured for key-based auth (`ssh-copy-id marron@192.168.5.67` has been
set up), so the deploy is non-interactive. The Express API on port 3000 is not
restarted by this script.

## Gotchas — intended homelab coupling

This is a single-machine homelab deployment, not a portable product. The hardcoded
paths/hosts/toolchain below are **intentional** — do not refactor them for
portability or "fix" them as if they were bugs:

- Media library path `/mnt/media` is hardcoded in `src/server.js` and `scripts/convert-videos.ts`
- Maintenance scripts log to `/home/marron/ProjectM/logs/` (intended; just ensure the dir exists)
- `scripts/extract-subtitles.ts` uses `ffmpeg.exe` and WSL→Windows path conversion (designed to run under WSL); PGS (`hdmv_pgs_subtitle`) tracks are extracted to `.sup` then OCR'd via repo-local tooling (gitignored): `pgsrip` in `.venv/` + tesseract 4.1.1 in `.tools/` (wrapper `.tools/bin/tesseract` sets `LD_LIBRARY_PATH`/`TESSDATA_PREFIX`; the script injects it into `PATH`). Only `eng.traineddata` is installed — other languages need more traineddata files. pgsrip needs the language as a 2-letter code in the temp `.sup` filename (3-letter codes hit a path-translation bug)
- `scripts/sync-subtitles.ts` rsyncs over SSH to host `192.168.5.67` (overridable via `SSH_HOST`)
- Server reads config only from `../.env` via a hand-rolled parser (fine while that file exists)
- No on-the-fly transcoding: `/stream/:id` always serves the **original** file as-is (browser compatibility is handled offline by `scripts/convert-videos.ts`); subtitles are a separate layer (extraction scripts + SRT→VTT conversion + ASS via assjs)

## To do — known issues (diagnosed 2026-07-22)

### Critical — security

- [x] ~~Path traversal in `/stream/:id`, `/media/:id`, `/api/tracks/:id`~~ — fixed 2026-07-22: `safeJoin()` rejects paths escaping `MEDIA_PATH` (residual: symlinks inside `/mnt/media` pointing outside are not detected)
- [x] ~~Path traversal write in `/api/subtitles/:id`~~ — fixed 2026-07-22: subs dirs go through `safeJoin()`, `lang` whitelisted to `/^[a-z]{2,3}$/`, `id` validated as `movie|tv-<digits>`
- [ ] No authentication on any endpoint: verify Supabase JWT server-side (CORS restricted to frontend origin 2026-07-22; remaining hole = anyone who can reach port 3000 directly, e.g. LAN/curl)

### Critical — build

- [x] ~~`vite`, `typescript`, `@vitejs/plugin-react` missing from `package.json`~~ — fixed 2026-08-14: added to `devDependencies`
- [x] ~~`"start:server": "node server.js"` points at a nonexistent root file~~ — fixed 2026-08-14: changed to `node src/server.js`

### High

- [ ] `loadContentWithPaths()` rescans the whole library per request (every Range chunk!); add caching with TTL/mtime invalidation (`src/server.js:213-239`)
- [x] ~~Frontend re-fetches `/api/content-availability` on every `HomePage` and `PlayerPage` mount~~ — fixed 2026-08-14: added `ContentProvider`/`useContent()`; `App.tsx` fetches once per SPA session and all pages consume the shared context, so React Router navigation no longer triggers refetches
- [x] ~~Missing `'error'` handlers crash the process~~ — fixed 2026-07-22: video read stream, ffprobe child, and `res.download` callback all guarded (plus stream destroy on client disconnect)
- [ ] Unauthenticated OpenSubtitles downloads → quota abuse; gate behind auth (lang whitelist in place since 2026-07-22, so cache-key spray is limited to ~17k valid codes)
- [ ] Scraper data loss (`scraper.ts`): poster/metadata use bare numeric TMDB id → `movie-123`/`tv-123` overwrite each other (lines 185/198); corrupt-DB `catch {}` then overwrite (lines 26-31); non-atomic full-DB rewrite per item (line 226); transient network errors permanently blacklist items via `skipped.txt` (lines 228-232)
- [x] ~~`scripts/convert-videos.ts` data loss~~ — fixed 2026-07-27: maps `0:v:0` + all audio tracks (`-map 0:a?`, dual-audio preserved; embedded subs/attachments intentionally dropped since VTTs are external), forces `-pix_fmt yuv420p` (10-bit sources → browser-decodable 8-bit H.264), originals kept by default (`DELETE_ORIGINAL=1` to opt in). Residual: `<basename>.mp4` collisions + `-y` can still overwrite an existing mp4
- [x] 6,651 `node_modules/` files committed to git — untracked 2026-07-22 (still present in old history commits)
- [x] ~~Add `.env.local` / `.env.*.local` to `.gitignore`~~ — fixed 2026-08-14
- [ ] TMDB API key leaks into logs on fetch failure (`scraper.ts:49` includes `?api_key=` in the error URL)
- [ ] `.env.production` defines `API_URL` but `PlayerPage.tsx:39` reads `VITE_URL` → player broken in prod builds; unify env var names + validate at startup
- [x] ~~Wishlist is dead: `WatchlistProvider` never mounted; local wishlist state lost on navigation~~ — fixed 2026-11-11: `WishlistProvider` mounted in `App.tsx`, new `useWishlist()` hook shared by `HomePage`/`WishlistPage` (optimistic toggle with revert on failure). WishlistPage now opens the preview modal on card select and shows an empty state
- [ ] Auth gates nothing: no route checks `useAuth()`; protect routes or drop the login flow

### Medium

- [x] ~~Audio-track selection is dropped but the code is still live~~ — fixed 2026-11-11: menu/state/`?audio=` param and the `/api/tracks/:id` fetch stripped from `PlayerPage.tsx` (`/api/tracks/:id` endpoint still exists server-side for a future remux-based implementation)
- [ ] Range handling (`server.js:350-363`): clamp `end` to `fileSize-1`, return 416 for invalid/suffix ranges, use per-extension `Content-Type` (not hardcoded `video/mp4`)
- [ ] Route shadowing: `/media/:id` registered before `express.static` (`server.js:241` vs 272) — reorder/reconcile
- [ ] Subtitle matching bugs: ~~unpadded `S1E2` never matches~~ — fixed 2026-07-26: sub-file ↔ video episode comparison now goes through `normalizeEpisodeId()` (numeric, padding-insensitive) and `SxxEyy` regexes accept 3-digit episodes (`S01E001`) in `server.js`, `PlayerPage.tsx`, `extract-subtitles.ts`. Remaining: `NNxNN` filenames unparsed; `(year)` in folder names breaks OpenSubtitles filtering; case-sensitive `.ass`/`.vtt` checks; episode-less sub files served for every episode
- [ ] Fuzzy `matches()` (60% word overlap, first-match-wins) mismatches one-word titles nondeterministically (`server.js:102-111`)
- [x] ~~Stale subtitle `<track>`s leak into next episode's `<video>`~~ — fixed 2026-11-11: `subtitleTracks`/`subtitleTracksRef` reset at the start of the load effect
- [ ] Item-load effect has no race guard or error handling (`PlayerPage.tsx:156-178`)
- [x] ~~Directional nav `preventDefault()`s all arrow keys before checking focus~~ — fixed 2026-11-11: arrow keys are only swallowed when a registered grid element is focused
- [x] ~~CardsGrid: blank grid after category switch; search-after-scroll registers shifted col indices~~ — fixed 2026-11-11: range resets whenever `items` changes, and search mode renders all items with absolute col indices; HomePage memoizes the filtered arrays so the reset isn't a re-render loop
- [ ] Scripts: shell-injection-prone path interpolation (`extract-subtitles.ts:97,205,212`, `sync-subtitles.ts:82,105`, `convert-videos.ts:58-60`); convert-videos re-encodes already-h264 video lossily (use `-c:v copy` when possible)
- [x] ~~Relative `href="style.css"` breaks on nested routes; Plyr CSS loaded from CDN~~ — fixed 2026-11-11: `/style.css` absolute, Plyr CSS imported from the installed `plyr` package in `index.tsx`
- [ ] No typecheck ever runs (`typescript` not installed, no script); strict-mode errors already exist (e.g. `convert-videos.ts:70-71`)

### Low

- [x] ~~`npm test` placeholder always fails; `"preview"` rebuilds instead of `vite preview`; `"main": "index.js"` nonexistent~~ — fixed 2026-08-14
- [ ] unused `jsdom` deps
- [x] ~~`LoginPage` sends "Username" text field as `email:`; no redirect away from `/login` when authenticated~~ — fixed 2026-11-11: field relabelled "Email" (`type="email"`, `autoComplete="email"`), labels associated via `htmlFor`, error announced via `role="alert"`, authenticated users redirected to `/`
- [ ] No fetch timeouts (server + frontend); unbounded `episodeNameCache`; OpenSubtitles download tokens logged; JSON errors served as `Content-Type: text/vtt`
- [ ] `parseEpisodeFromPath` fabricates "S1E1" for unmatched files; ASS subtitles fetched twice; `navigate(-1)` back buttons break on direct loads
- [ ] README is empty
- [ ] Optional: replace hand-rolled `.env` parser (`server.js:16-33`) with `dotenv` so real env vars and `.env.production` are honored — homelab `.env` file works fine as-is
