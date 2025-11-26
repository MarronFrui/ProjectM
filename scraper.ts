import * as fs from "node:fs";
import * as path from "node:path";
import { Buffer } from "node:buffer";
import keyConfig from "./apikey.json" assert { type: "json" };
import { ContentItem } from "./config";

const API_KEY = keyConfig.API_KEY;
const BASE_URL = "https://www.omdbapi.com/";

const POSTER_DIR = "./content-info/poster";
const METADATA_DIR = "./content-info/metadata";
const OUTPUT_FILE = "./content-info/contentDB.json";

// Ensure directories exist
fs.mkdirSync(POSTER_DIR, { recursive: true });
fs.mkdirSync(METADATA_DIR, { recursive: true });

// Load existing DB
let contentDB: ContentItem[] = [];
if (fs.existsSync(OUTPUT_FILE)) {
    contentDB = JSON.parse(fs.readFileSync(OUTPUT_FILE, "utf-8"));
}

// Helper to fetch JSON from OMDb
async function fetchJSON(url: string) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.statusText}`);
    return res.json();
}

// Download poster image
async function downloadPoster(url: string, filename: string) {
    if (!url || url === "N/A") return;
    const res = await fetch(url);
    if (!res.ok) return;
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(filename, buffer);
}

// Fetch popular shows (example list or daily pull)
const fetchRequest = [
    "Breaking Bad",
    "Stranger Things",
    "The Witcher",
    "Game of Thrones",
    "Friends",
    "Star Wars",
    "Arcane",
];

async function fetchShows(limit = 20): Promise<ContentItem[]> {
    const items: ContentItem[] = [];

    for (let i = 0; i < Math.min(limit, fetchRequest.length); i++) {
        const title = fetchRequest[i];

        // Check if already in DB
        if (contentDB.some((item) => item.name === title)) continue;

        const url = `${BASE_URL}?apikey=${API_KEY}&t=${encodeURIComponent(
            title
        )}&type=movie`;
        let data = await fetchJSON(url);
        // fallback to series if movie not found
        if (!data || data.Response === "False") {
            const url2 = `${BASE_URL}?apikey=${API_KEY}&t=${encodeURIComponent(
                title
            )}&type=series`;
            data = await fetchJSON(url2);
        }

        // Save metadata
        const metadataPath = path.join(METADATA_DIR, `${data.imdbID}.json`);
        fs.writeFileSync(metadataPath, JSON.stringify(data, null, 2));

        // Download poster
        let posterPath = "./content-info/poster/default.jpg";
        if (data.Poster && data.Poster !== "N/A") {
            posterPath = path.join(POSTER_DIR, `${data.imdbID}.jpg`);
            await downloadPoster(data.Poster, posterPath);
        }

        const contentItem: ContentItem = {
            id: `omdb-${data.imdbID}`,
            imdbID: data.imdbID,
            name: data.Title,
            description: data.Plot !== "N/A" ? data.Plot : "No description",
            category: "Serie",
            available: true,
            duration: parseInt(data.Runtime) || 22,
            seasons: data.totalSeasons ? parseInt(data.totalSeasons) : 1,
            episodes: null, // OMDb doesn’t provide episodes count
            poster: posterPath,
        };

        items.push(contentItem);
        contentDB.push(contentItem);
    }

    // Save updated DB
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(contentDB, null, 2));
    console.log(`Saved ${items.length} new shows to ${OUTPUT_FILE}`);
    return items;
}

// Run scraper
fetchShows().catch(console.error);
