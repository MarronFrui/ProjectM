import * as fs from "node:fs";
import * as path from "node:path";
import { Buffer } from "node:buffer";
import keyConfig from "./apikey.json" assert { type: "json" };
import { ContentItem } from "./config";

const API_KEY = keyConfig.API_KEY;
const BASE_URL = "https://api.themoviedb.org/3";

const IMDB_DIR = "./content-info/imdb";
const BASICS_FILE = path.join(IMDB_DIR, "title.basics.tsv");
const RATINGS_FILE = path.join(IMDB_DIR, "title.ratings.tsv");

const POSTER_DIR = "./content-info/poster";
const METADATA_DIR = "./content-info/metadata";
const OUTPUT_FILE = "./content-info/contentDB.json";
const SKIPPED_FILE = "./content-info/skipped.txt";

const DISCOVERY_LIMIT = 50;
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/original";

fs.mkdirSync(POSTER_DIR, { recursive: true });
fs.mkdirSync(METADATA_DIR, { recursive: true });
fs.mkdirSync(IMDB_DIR, { recursive: true });

// Load existing content DB
let contentDB: ContentItem[] = [];
if (fs.existsSync(OUTPUT_FILE)) {
    try {
        const raw = fs.readFileSync(OUTPUT_FILE, "utf-8").trim();
        contentDB = raw ? JSON.parse(raw) : [];
    } catch {}
}
const existingImdbSet = new Set(contentDB.map((c) => c.imdbID));

// Load skipped IDs
let skippedImdbSet = new Set<string>();
if (fs.existsSync(SKIPPED_FILE)) {
    const raw = fs.readFileSync(SKIPPED_FILE, "utf-8");
    skippedImdbSet = new Set(raw.split("\n").filter(Boolean));
}

function addSkipped(id: string) {
    if (!skippedImdbSet.has(id)) {
        skippedImdbSet.add(id);
        fs.appendFileSync(SKIPPED_FILE, `${id}\n`);
    }
}
// ------------------- Helpers -------------------
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

function headerIndices(headerLine: string) {
    const cols = headerLine.split("\t");
    return Object.fromEntries(cols.map((c, i) => [c, i]));
}

// ------------------- Load Ratings -------------------
async function loadRatings(ratingsPath: string) {
    console.log("Loading IMDb ratings...");
    const map = new Map<
        string,
        { averageRating: number | null; numVotes: number | null }
    >();
    if (!fs.existsSync(ratingsPath)) return map;

    const input = fs.createReadStream(ratingsPath, { encoding: "utf8" });
    let leftover = "";
    let indices: Record<string, number> = {};
    let headerProcessed = false;

    for await (const chunk of input) {
        let text = leftover + chunk;
        const lines = text.split("\n");
        leftover = lines.pop() ?? "";

        for (let line of lines) {
            line = line.trim();
            if (!line) continue;
            if (!headerProcessed) {
                indices = headerIndices(line);
                headerProcessed = true;
                continue;
            }
            const cols = line.split("\t");
            const tconst = cols[indices["tconst"]];
            map.set(tconst, {
                averageRating:
                    cols[indices["averageRating"]] === "\\N"
                        ? null
                        : parseFloat(cols[indices["averageRating"]]),
                numVotes:
                    cols[indices["numVotes"]] === "\\N"
                        ? null
                        : parseInt(cols[indices["numVotes"]], 10),
            });
        }
    }

    if (leftover.trim() && headerProcessed) {
        const cols = leftover.trim().split("\t");
        const tconst = cols[indices["tconst"]];
        map.set(tconst, {
            averageRating:
                cols[indices["averageRating"]] === "\\N"
                    ? null
                    : parseFloat(cols[indices["averageRating"]]),
            numVotes:
                cols[indices["numVotes"]] === "\\N"
                    ? null
                    : parseInt(cols[indices["numVotes"]], 10),
        });
    }

    return map;
}

// ------------------- Build Candidates -------------------
type Candidate = {
    tconst: string;
    primaryTitle: string;
    titleType: string;
    startYear: number | null;
    runtimeMinutes: number | null;
    genres: string | null;
    numVotes: number;
};

async function buildCandidates(
    basicsPath: string,
    ratingsMap: Map<
        string,
        { averageRating: number | null; numVotes: number | null }
    >
) {
    console.log("Building discovery candidates from IMDb basics...");
    const candidates: Candidate[] = [];
    if (!fs.existsSync(basicsPath))
        throw new Error(`IMDb basics file not found: ${basicsPath}`);

    const input = fs.createReadStream(basicsPath, { encoding: "utf8" });
    let leftover = "";
    let indices: Record<string, number> = {};
    let headerProcessed = false;

    for await (const chunk of input) {
        let text = leftover + chunk;
        const lines = text.split("\n");
        leftover = lines.pop() ?? "";

        for (let line of lines) {
            line = line.trim();
            if (!line) continue;
            if (!headerProcessed) {
                indices = headerIndices(line);
                headerProcessed = true;
                continue;
            }

            const cols = line.split("\t");
            const tconst = cols[indices["tconst"]];
            const titleType = cols[indices["titleType"]];
            if (!(titleType === "movie" || titleType === "tvSeries")) continue;

            const startYear =
                cols[indices["startYear"]] === "\\N"
                    ? null
                    : parseInt(cols[indices["startYear"]], 10);
            const runtimeMinutes =
                cols[indices["runtimeMinutes"]] === "\\N"
                    ? null
                    : parseInt(cols[indices["runtimeMinutes"]], 10);

            candidates.push({
                tconst,
                primaryTitle: cols[indices["primaryTitle"]],
                titleType,
                startYear,
                runtimeMinutes,
                genres: cols[indices["genres"]],
                numVotes: ratingsMap.get(tconst)?.numVotes ?? 0,
            });
        }
    }

    if (leftover.trim() && headerProcessed) {
        const cols = leftover.trim().split("\t");
        const tconst = cols[indices["tconst"]];
        const titleType = cols[indices["titleType"]];
        if (titleType === "movie" || titleType === "tvSeries") {
            const startYear =
                cols[indices["startYear"]] === "\\N"
                    ? null
                    : parseInt(cols[indices["startYear"]], 10);
            const runtimeMinutes =
                cols[indices["runtimeMinutes"]] === "\\N"
                    ? null
                    : parseInt(cols[indices["runtimeMinutes"]], 10);
            candidates.push({
                tconst,
                primaryTitle: cols[indices["primaryTitle"]],
                titleType,
                startYear,
                runtimeMinutes,
                genres: cols[indices["genres"]],
                numVotes: ratingsMap.get(tconst)?.numVotes ?? 0,
            });
        }
    }

    console.log(
        `Found ${candidates.length} candidate titles. Sorting & selecting top ${DISCOVERY_LIMIT}...`
    );
    return candidates;
}

// ------------------- TMDb Fetch -------------------
async function fetchAndBuildItem(c: Candidate): Promise<ContentItem | null> {
    if (existingImdbSet.has(c.tconst) || skippedImdbSet.has(c.tconst))
        return null;

    try {
        // Determine endpoint based on type
        const isSeries = c.titleType === "tvSeries";
        const query = encodeURIComponent(c.primaryTitle);
        const yearParam = c.startYear ? `&year=${c.startYear}` : "";
        const endpoint = isSeries ? "search/tv" : "search/movie";

        const dataSearch = await fetchJSON(
            `${BASE_URL}/${endpoint}?api_key=${API_KEY}&query=${query}${yearParam}`
        );

        if (!dataSearch.results || dataSearch.results.length === 0) {
            console.log(`TMDb lookup failed for ${c.tconst}: not found.`);
            addSkipped(c.tconst);
            return null;
        }

        const data = dataSearch.results[0];
        const releaseYear = data.release_date
            ? parseInt(data.release_date.slice(0, 4), 10)
            : data.first_air_date
            ? parseInt(data.first_air_date.slice(0, 4), 10)
            : null;

        let duration = 0;
        if (!isSeries) {
            const details = await fetchJSON(
                `${BASE_URL}/movie/${data.id}?api_key=${API_KEY}`
            );
            duration = details.runtime ?? c.runtimeMinutes ?? 0;
        } else {
            // For series, use episode runtime if available
            const details = await fetchJSON(
                `${BASE_URL}/tv/${data.id}?api_key=${API_KEY}`
            );
            duration = details.episode_run_time?.[0] ?? 0;
        }

        const nowYear = new Date().getFullYear();
        if (!releaseYear || releaseYear > nowYear) {
            console.log(
                `Skipping ${c.primaryTitle} (${c.tconst}): release year in the future`
            );
            addSkipped(c.tconst);

            return null;
        }

        // Duration checks
        if (!isSeries && duration < 60) {
            console.log(
                `Skipping ${c.primaryTitle} (${c.tconst}): film too short (${duration} min)`
            );
            addSkipped(c.tconst);
            return null;
        }
        if (isSeries && duration < 20) {
            console.log(
                `Skipping ${c.primaryTitle} (${c.tconst}): series too short (${duration} min)`
            );
            addSkipped(c.tconst);
            return null;
        }

        // Poster
        const posterPath = path.join(POSTER_DIR, `${data.id}.jpg`);
        const posterUrl = data.poster_path
            ? `${TMDB_IMAGE_BASE}${data.poster_path}`
            : null;
        if (!posterUrl || !(await downloadPoster(posterUrl, posterPath))) {
            console.log(
                `Skipping ${c.primaryTitle} (${c.tconst}): poster download failed`
            );
            addSkipped(c.tconst);
            return null;
        }

        // Save metadata
        const metadataPath = path.join(METADATA_DIR, `${data.id}.json`);
        try {
            fs.writeFileSync(metadataPath, JSON.stringify(data, null, 2));
        } catch {}

        const item: ContentItem = {
            id: `tmdb-${data.id}`,
            imdbID: c.tconst,
            name: data.title ?? data.name ?? c.primaryTitle,
            description: data.overview ?? "No description",
            category: mapCategory(isSeries ? "tv" : "movie"),
            available: true,
            duration,
            seasons: isSeries ? data.number_of_seasons ?? 1 : null,
            episodes: isSeries ? data.number_of_episodes ?? null : null,
            poster: posterPath,
            releaseYear,
        };

        existingImdbSet.add(c.tconst);
        contentDB.push(item);
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(contentDB, null, 2));
        return item;
    } catch (err) {
        console.log(`TMDb lookup failed for ${c.tconst}: fetch error`);
        addSkipped(c.tconst);
        return null;
    }
}


async function run() {
    const ratingsMap = await loadRatings(RATINGS_FILE);
    const candidates = await buildCandidates(BASICS_FILE, ratingsMap);

    console.log(
        `Fetching TMDb metadata for ${Math.min(
            DISCOVERY_LIMIT,
            candidates.length
        )} candidates (will skip duplicates/missing posters)...`
    );

    candidates.sort((a, b) => {
        const yearA = a.startYear ?? 0;
        const yearB = b.startYear ?? 0;
        if (yearA !== yearB) return yearB - yearA;

        if (a.numVotes !== b.numVotes) return b.numVotes - a.numVotes;

        // 3. Optional: prefer movies over series
        const typeScore: Record<string, number> = { movie: 2, tvSeries: 1 };
        return (typeScore[b.titleType] ?? 0) - (typeScore[a.titleType] ?? 0);
    });

    let added = 0;
    for (const candidate of candidates) {
        if (added >= DISCOVERY_LIMIT) break;
        const item = await fetchAndBuildItem(candidate);
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
