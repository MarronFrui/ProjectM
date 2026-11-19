import * as fs from "node:fs";
import * as path from "node:path";
import { Buffer } from "node:buffer";
import { ContentItem } from "./config";

// TMDB key lives in .env (TMDB_API_KEY=...), same file the server parses
const API_KEY =
    process.env.TMDB_API_KEY ??
    fs
        .readFileSync(new URL("./.env", import.meta.url), "utf-8")
        .split("\n")
        .find((line) => line.startsWith("TMDB_API_KEY="))
        ?.slice("TMDB_API_KEY=".length)
        .trim() ??
    "";
const BASE_URL = "https://api.themoviedb.org/3";

const POSTER_DIR = "./content-info/poster";
const METADATA_DIR = "./content-info/metadata";
const OUTPUT_FILE = "./content-info/contentDB.json";
const SKIPPED_FILE = "./content-info/skipped.txt";

const TOP_RATED_LIMIT = 500; // First X ammount of content are sorted by review
const DISCOVERY_LIMIT = 1000; // Then fallback to release date prioritization

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/original";

type Phase = "top-rated" | "recent";

fs.mkdirSync(POSTER_DIR, { recursive: true });
fs.mkdirSync(METADATA_DIR, { recursive: true });

let contentDB: ContentItem[] = [];
if (fs.existsSync(OUTPUT_FILE)) {
    try {
        const raw = fs.readFileSync(OUTPUT_FILE, "utf-8").trim();
        contentDB = raw ? JSON.parse(raw) : [];
    } catch {}
}
const existingTmdbSet = new Set(contentDB.map((c) => c.id));

let skippedSet = new Set<string>();
if (fs.existsSync(SKIPPED_FILE)) {
    const raw = fs.readFileSync(SKIPPED_FILE, "utf-8");
    skippedSet = new Set(raw.split("\n").filter(Boolean));
}

function addSkipped(id: string) {
    if (!skippedSet.has(id)) {
        skippedSet.add(id);
        fs.appendFileSync(SKIPPED_FILE, `${id}\n`);
    }
}

async function fetchJSON(url: string) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
    return res.json();
}

async function downloadPoster(url: string, filename: string) {
    if (!url) return false;
    const res = await fetch(url);
    if (!res.ok) return false;
    const arrayBuffer = await res.arrayBuffer();
    fs.writeFileSync(filename, Buffer.from(arrayBuffer));
    return true;
}

type Candidate = {
    id: number;
    title: string;
    type: "movie" | "tv";
    releaseDate: string;
    rating: number;
};

function buildDiscoverURL(type: "movie" | "tv", page: number, phase: Phase) {
    const today = new Date().toISOString().slice(0, 10);

    if (phase === "top-rated") {
        return type === "movie"
            ? `${BASE_URL}/movie/top_rated?api_key=${API_KEY}&page=${page}`
            : `${BASE_URL}/tv/top_rated?api_key=${API_KEY}&page=${page}`;
    }

    return type === "movie"
        ? `${BASE_URL}/discover/movie?api_key=${API_KEY}&sort_by=release_date.desc&release_date.lte=${today}&page=${page}`
        : `${BASE_URL}/discover/tv?api_key=${API_KEY}&sort_by=first_air_date.desc&first_air_date.lte=${today}&page=${page}`;
}

async function fetchCandidates(page = 1, phase: Phase): Promise<Candidate[]> {
    const movieURL = buildDiscoverURL("movie", page, phase);
    const tvURL = buildDiscoverURL("tv", page, phase);

    const movieData = await fetchJSON(movieURL);
    const tvData = await fetchJSON(tvURL);



    const movies = (movieData.results ?? []).map((r: any) => ({
        id: r.id,
        title: r.title ?? r.name,
        type: "movie" as const,
        releaseDate: r.release_date ?? "",
        rating: r.vote_average ?? 0,
    }));

    const series = (tvData.results ?? []).map((r: any) => ({
        id: r.id,
        title: r.name,
        type: "tv" as const,
        releaseDate: r.first_air_date ?? "",
        rating: r.vote_average ?? 0,
    }));

    return [...movies, ...series];
}

async function fetchAndBuildItem(c: Candidate, forceAdd = false): Promise<ContentItem | null> {
    const key = `${c.type}-${c.id}`;
    
    console.log(`[DEBUG] Attempting to add: ${c.title} (${key})`);
    console.log(`[DEBUG] In existing: ${existingTmdbSet.has(key)}, In skipped: ${skippedSet.has(key)}, forceAdd: ${forceAdd}`);
    
    if (existingTmdbSet.has(key)) {
        console.log(`Skipping ${c.title}: already in database`);
        return null;
    }
    if (skippedSet.has(key) && !forceAdd) {
        console.log(`Skipping ${c.title}: in skipped list`);
        return null;
    }
    try {
        const detailsUrl =
            c.type === "movie"
                ? `${BASE_URL}/movie/${c.id}?api_key=${API_KEY}`
                : `${BASE_URL}/tv/${c.id}?api_key=${API_KEY}`;

        const details = await fetchJSON(detailsUrl);

        let duration = 0;
        if (c.type === "movie") {
            duration = details.runtime ?? 0;
            if (duration < 60) {
                console.log(
                    `Skipping ${c.title}: film too short (${duration} min)`,
                );
                addSkipped(key);
                return null;
            }
            if (duration > 300) {
                console.log(
                    `Skipping ${c.title}: film too long (${duration} min)`,
                );
                addSkipped(key);
                return null;
            }
         } else {
        const runtimes = (details.episode_run_time ?? []).filter(
            (r: number) => r > 0,
        );
        const avgEpisodeDuration = runtimes.length
            ? runtimes.reduce((a: number, b: number) => a + b) /
              runtimes.length
            : 0;
        const numberOfEpisodes = details.number_of_episodes ?? 0;
        duration = Math.round(numberOfEpisodes * avgEpisodeDuration);

        if (!forceAdd && duration < 20) {
            console.log(
                `Skipping ${c.title}: series too short (${duration} min)`,
            );
            addSkipped(key);
            return null;
        }
    }

        const title = details.title ?? details.name ?? c.title;
        if (!/^[\u0000-\u007F]+$/.test(title)) {
            console.log(`Skipping ${title}: non-Latin characters detected`);
            addSkipped(key);
            return null;
        }

        const rating = details.vote_average ?? 0;
        if (rating < 6) {
            console.log(`Skipping ${title}: rating too low (${rating})`);
            addSkipped(key);
            return null;
        }

        const posterFilePath = path.join(POSTER_DIR, `${c.id}.jpg`);
        const publicPosterPath = `/content-info/poster/${c.id}.jpg`;

        const posterUrl = details.poster_path
            ? `${TMDB_IMAGE_BASE}${details.poster_path}`
            : null;

        if (!posterUrl || !(await downloadPoster(posterUrl, posterFilePath))) {
            console.log(`Skipping ${c.title}: poster download failed`);
            addSkipped(key);
            return null;
        }

        const metadataPath = path.join(METADATA_DIR, `${c.id}.json`);
        try {
            fs.writeFileSync(metadataPath, JSON.stringify(details, null, 2));
        } catch {}

        const item: ContentItem = {
            id: key,
            name: title,
            description: details.overview ?? "No description",
            category: (details.genres ?? []).map((g: any) => g.name),
            available: true,
            duration,
            rating,
            seasons: c.type === "tv" ? (details.number_of_seasons ?? 1) : null,
            episodes:
                c.type === "tv" ? (details.number_of_episodes ?? null) : null,
            poster: publicPosterPath,
            releaseYear: parseInt(
                (details.release_date ?? details.first_air_date ?? "0").slice(
                    0,
                    4,
                ),
                10,
            ),
        };

        existingTmdbSet.add(key);
        contentDB.push(item);
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(contentDB, null, 2));
        return item;
    } catch (err) {
        console.log(`Failed ${c.title}: fetch error`);
        addSkipped(key);
        return null;
    }
}

async function searchTMDB(query: string): Promise<Candidate[]> {
    const movieUrl = `${BASE_URL}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(query)}`;
    const tvUrl = `${BASE_URL}/search/tv?api_key=${API_KEY}&query=${encodeURIComponent(query)}`;

    const [movieData, tvData] = await Promise.all([
        fetchJSON(movieUrl),
        fetchJSON(tvUrl),
    ]);

    const movies = (movieData.results ?? []).map((r: any) => ({
        id: r.id,
        title: r.title ?? r.name,
        type: "movie" as const,
        releaseDate: r.release_date ?? "",
        rating: r.vote_average ?? 0,
    }));

    const series = (tvData.results ?? []).map((r: any) => ({
        id: r.id,
        title: r.name,
        type: "tv" as const,
        releaseDate: r.first_air_date ?? "",
        rating: r.vote_average ?? 0,
    }));

    return [...movies, ...series];
}

async function runPhase(phase: Phase, phaseLimit: number) {
    let added = 0;
    let page = 1;

    while (added < phaseLimit) {
        const candidates = await fetchCandidates(page, phase);
        if (candidates.length === 0) break;

        candidates.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));

        for (const c of candidates) {
            const item = await fetchAndBuildItem(c);
            if (item) {
                added++;
                console.log(
                    `Added: ${item.name} (${item.id}) [phase=${phase}]`,
                );
            }
            if (added >= phaseLimit) break;
        }

        page++;
    }

    console.log(`Phase ${phase} finished. Added ${added} new items.`);
}



async function run() {
    const rl = await import("node:readline");
    const interface_ = rl.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    const ask = (q: string) =>
        new Promise<string>((res) => interface_.question(q, res));

    const choice = await ask("Add specific content? (y/N): ");

    if (choice.toLowerCase() === "y") {
        interface_.close();
        const rl2 = rl.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        const query = await new Promise<string>((res) =>
            rl2.question("Search: ", res)
        );
        rl2.close();

        const results = await searchTMDB(query);
        console.log(`\nFound ${results.length} results:\n`);
        results.forEach((r, i) => {
            console.log(`${i + 1}. ${r.title} (${r.type}) - ${r.releaseDate.slice(0, 4)}`);
        });

        const idx = await new Promise<string>((res) => {
            const rl3 = rl.createInterface({
                input: process.stdin,
                output: process.stdout,
            });
            rl3.question("\nSelect number to add (0 to skip): ", (a) => {
                rl3.close();
                res(a);
            });
        });

        const selected = results[parseInt(idx) - 1];
        if (selected) {
            const item = await fetchAndBuildItem(selected, true); // true = force add, bypass duration check
            if (item) {
                console.log(`\nAdded: ${item.name}`);
            } else {
                console.log(`\nFailed to add: ${selected.title}`);
            }
        }
    } else {
        interface_.close();
        await runPhase("top-rated", TOP_RATED_LIMIT);
        await runPhase("recent", DISCOVERY_LIMIT);
        console.log(`Completed all phases. DB now has ${contentDB.length} items.`);
    }
}

run().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
});
