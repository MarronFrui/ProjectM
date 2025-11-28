import * as fs from "node:fs";
import * as path from "node:path";
import { Buffer } from "node:buffer";
import keyConfig from "./apikey.json" assert { type: "json" };
import { ContentItem } from "./config";

const API_KEY = keyConfig.API_KEY;
const BASE_URL = "https://api.themoviedb.org/3";

const POSTER_DIR = "./content-info/poster";
const METADATA_DIR = "./content-info/metadata";
const OUTPUT_FILE = "./content-info/contentDB.json";
const SKIPPED_FILE = "./content-info/skipped.txt";

const DISCOVERY_LIMIT = 50;
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/original";

fs.mkdirSync(POSTER_DIR, { recursive: true });
fs.mkdirSync(METADATA_DIR, { recursive: true });

// Load existing content DB
let contentDB: ContentItem[] = [];
if (fs.existsSync(OUTPUT_FILE)) {
    try {
        const raw = fs.readFileSync(OUTPUT_FILE, "utf-8").trim();
        contentDB = raw ? JSON.parse(raw) : [];
    } catch {}
}
const existingTmdbSet = new Set(contentDB.map((c) => c.id));

// Load skipped IDs
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

function mapCategory(type?: string): "Film" | "Serie" | "Documentaire" {
    if (!type) return "Film";
    const t = type.toLowerCase();
    if (t === "movie") return "Film";
    if (t === "tv") return "Serie";
    return "Film";
}

type Candidate = {
    id: number;
    title: string;
    type: "movie" | "tv";
    releaseDate: string;
};

// Example: fetch latest TMDb content (adjust genre or discover query)
async function fetchCandidates(): Promise<Candidate[]> {
    const today = new Date().toISOString().slice(0, 10);
    const data = await fetchJSON(
        `${BASE_URL}/discover/movie?api_key=${API_KEY}&sort_by=release_date.desc&release_date.lte=${today}`
    );

    const movies = (data.results ?? []).map((r: any) => ({
        id: r.id,
        title: r.title ?? r.name,
        type: "movie" as const,
        releaseDate: r.release_date ?? "",
    }));

    const tvData = await fetchJSON(
        `${BASE_URL}/discover/tv?api_key=${API_KEY}&sort_by=first_air_date.desc&first_air_date.lte=${today}`
    );

    const series = (tvData.results ?? []).map((r: any) => ({
        id: r.id,
        title: r.name,
        type: "tv" as const,
        releaseDate: r.first_air_date ?? "",
    }));

    return [...movies, ...series];
}

async function fetchAndBuildItem(c: Candidate): Promise<ContentItem | null> {
    const key = `${c.type}-${c.id}`;
    if (existingTmdbSet.has(key) || skippedSet.has(key)) return null;

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
                    `Skipping ${c.title}: film too short (${duration} min)`
                );
                addSkipped(key);
                return null;
            }
        } else {
            const runtimes = (details.episode_run_time ?? []).filter(
                (r: number) => r > 0
            );
            const avgEpisodeDuration = runtimes.length
                ? runtimes.reduce((a: number, b: number) => a + b, 0) /
                  runtimes.length
                : 0;

            const numberOfEpisodes = details.number_of_episodes ?? 0;
            duration = Math.round(numberOfEpisodes * avgEpisodeDuration);

            if (duration < 20) {
                console.log(
                    `Skipping ${c.title}: series too short (${duration} min)`
                );
                addSkipped(key);
                return null;
            }
        }

        const posterPath = path.join(POSTER_DIR, `${c.id}.jpg`);
        const posterUrl = details.poster_path
            ? `${TMDB_IMAGE_BASE}${details.poster_path}`
            : null;
        if (!posterUrl || !(await downloadPoster(posterUrl, posterPath))) {
            console.log(`Skipping ${c.title}: poster download failed`);
            addSkipped(key);
            return null;
        }

        const metadataPath = path.join(METADATA_DIR, `${c.id}.json`);
        try {
            fs.writeFileSync(metadataPath, JSON.stringify(details, null, 2));
        } catch {}

        // Map genres from TMDb
        const genres: string[] = (details.genres ?? []).map((g: any) => g.name);

        const item: ContentItem = {
            id: key,
            name: details.title ?? details.name ?? c.title,
            description: details.overview ?? "No description",
            category: (details.genres ?? []).map((g: any) => g.name),
            available: true,
            duration,
            seasons: c.type === "tv" ? details.number_of_seasons ?? 1 : null,
            episodes:
                c.type === "tv" ? details.number_of_episodes ?? null : null,
            poster: posterPath,
            releaseYear: parseInt(
                (details.release_date ?? details.first_air_date ?? "0").slice(
                    0,
                    4
                ),
                10
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

async function run() {
    const candidates = await fetchCandidates();

    console.log(
        `Fetching TMDb metadata for up to ${DISCOVERY_LIMIT} new items...`
    );

    let added = 0;
    for (const c of candidates) {
        if (added >= DISCOVERY_LIMIT) break;
        const item = await fetchAndBuildItem(c);
        if (item) added++;
    }

    console.log(
        `Added ${added} new items. DB now has ${contentDB.length} items.`
    );
}

run().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
});
