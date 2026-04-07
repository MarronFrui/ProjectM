import express from "express";
import cors from "cors";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(cors());

const MEDIA_PATH = "/mnt/media";
const DB_PATH = path.resolve(__dirname, "../content-info/contentDB.json");

const envPath = path.resolve(__dirname, "../.env");
const tmdbApiKeyPath = path.resolve(__dirname, "../apikey.json");
let OPENSUBTITLES_API_KEY = "";
let TMDB_API_KEY = "";

try {
    const envContent = await fs.readFile(envPath, "utf-8");
    for (const line of envContent.split("\n")) {
        const [key, ...valueParts] = line.split("=");
        if (key && valueParts.length > 0) {
            if (key.trim() === "OPENSUBTITLES_API_KEY") {
                OPENSUBTITLES_API_KEY = valueParts.join("=").trim();
            }
        }
    }
} catch (e) {
    console.warn("Could not read .env file:", e.message);
}

try {
    const apiKeyContent = await fs.readFile(tmdbApiKeyPath, "utf-8");
    const apiKeyData = JSON.parse(apiKeyContent);
    TMDB_API_KEY = apiKeyData.API_KEY;
} catch (e) {
    console.warn("Could not read TMDB API key:", e.message);
}

console.log("Resolved DB path:", DB_PATH);
console.log("OpenSubtitles API Key loaded:", OPENSUBTITLES_API_KEY ? "Yes" : "No");
console.log("TMDB API Key loaded:", TMDB_API_KEY ? "Yes" : "No");

const episodeNameCache = new Map();
const EPISODE_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

async function getEpisodeName(tmdbId, season, episode) {
    const cacheKey = `${tmdbId}-${season}-${episode}`;
    
    const cached = episodeNameCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < EPISODE_CACHE_TTL_MS) {
        console.log(`[SUBTITLE] Episode name cache hit: ${cacheKey} = ${cached.name}`);
        return cached.name;
    }
    
    if (!TMDB_API_KEY) {
        throw new Error("TMDB API key not found");
    }
    
    const url = `https://api.themoviedb.org/3/tv/${tmdbId}/season/${season}/episode/${episode}?api_key=${TMDB_API_KEY}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
        throw new Error(`TMDB API error: ${response.status}`);
    }
    
    const data = await response.json();
    const episodeName = data.name;
    
    if (!episodeName) {
        throw new Error(`No episode name found for S${season}E${episode}`);
    }
    
    episodeNameCache.set(cacheKey, { name: episodeName, timestamp: Date.now() });
    console.log(`[SUBTITLE] Cached episode name: ${cacheKey} = ${episodeName}`);
    
    return episodeName;
}

function normalize(str) {
    return str
        .toLowerCase()
        .replace(/\(.*?\)/g, "") // remove (year etc)
        .replace(/[^a-z0-9]/g, " ")
        .trim();
}

const STOPWORDS = ["the", "of", "and"];

function matches(file, itemName) {
    const fWords = normalize(file).split(/\s+/);
    const iWords = normalize(itemName)
        .split(/\s+/)
        .filter((w) => !STOPWORDS.includes(w));

    const overlap = iWords.filter((word) => fWords.includes(word));

    return overlap.length >= Math.ceil(iWords.length * 0.6);
}

function normalizeMediaPath(requestedFile) {
    if (!requestedFile) return null;
    return requestedFile.replace(/^\/media\//, "");
}

async function scanMediaFolder(folderPath, isTvShow) {
    const result = {
        videos: [],
        subtitles: [],
        folderPath: path.basename(folderPath)
    };

    try {
        if (!isTvShow) {
            const files = await fs.readdir(folderPath);
            for (const file of files) {
                const fullPath = path.join(folderPath, file);
                const stat = await fs.stat(fullPath);
                if (stat.isFile()) {
                    if (/\.(mp4|mkv|avi|mov|webm)$/i.test(file)) {
                        result.videos.push(`/media/${path.basename(folderPath)}/${file}`);
                    } else if (/\.vtt$/i.test(file)) {
                        result.subtitles.push(`/media/${path.basename(folderPath)}/${file}`);
                    }
                }
            }
        } else {
            const entries = await fs.readdir(folderPath);
            for (const entry of entries) {
                const entryPath = path.join(folderPath, entry);
                const stat = await fs.stat(entryPath);

                if (stat.isDirectory()) {
                    const seasonFiles = await fs.readdir(entryPath);
                    for (const file of seasonFiles) {
                        const filePath = path.join(entryPath, file);
                        const fileStat = await fs.stat(filePath);
                        if (fileStat.isFile()) {
                            if (/\.(mp4|mkv|avi|mov|webm)$/i.test(file)) {
                                result.videos.push(`/media/${path.basename(folderPath)}/${entry}/${file}`);
                            } else if (/\.vtt$/i.test(file)) {
                                result.subtitles.push(`/media/${path.basename(folderPath)}/${entry}/${file}`);
                            }
                        }
                    }
                }
            }
        }
    } catch (err) {
        console.error(`Error scanning folder ${folderPath}:`, err.message);
    }

    return result;
}

app.get("/api/content-availability", async (req, res) => {
    try {
        const raw = await fs.readFile(DB_PATH, "utf-8");
        const contentDB = JSON.parse(raw);
        const files = await fs.readdir(MEDIA_PATH);

        const items = await Promise.all(contentDB.map(async (item) => {
            const match = files.find((f) => matches(f, item.name));

            if (!match) {
                return {
                    ...item,
                    available: false,
                    mediaFiles: null,
                };
            }

            const isTvShow = item.seasons !== null;
            const folderPath = path.join(MEDIA_PATH, match);
            const mediaFiles = await scanMediaFolder(folderPath, isTvShow);

            return {
                ...item,
                available: mediaFiles.videos.length > 0,
                mediaFiles,
            };
        }));

        res.json(items);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "failed" });
    }
});

async function loadContentWithPaths() {
    const raw = await fs.readFile(DB_PATH, "utf-8");
    const contentDB = JSON.parse(raw);
    const files = await fs.readdir(MEDIA_PATH);

    const updatedDb = await Promise.all(contentDB.map(async (item) => {
        const match = files.find((f) => matches(f, item.name));

        if (!match) {
            return { ...item, available: false, mediaFiles: null };
        }

        const isTvShow = item.seasons !== null;
        const folderPath = path.join(MEDIA_PATH, match);
        const mediaFiles = await scanMediaFolder(folderPath, isTvShow);

        return {
            ...item,
            available: mediaFiles.videos.length > 0,
            mediaFiles,
        };
    }));

    return updatedDb;
}

app.get("/media/:id", async (req, res) => {
    try {
        const requestedFile = req.query.file;
        const copyDB = await loadContentWithPaths();
        const item = copyDB.find(i => i.id === req.params.id);

        if (!item)
            return res.status(404).send("Item not found");

        let fullPath;
        if (requestedFile) {
            fullPath = path.join(MEDIA_PATH, normalizeMediaPath(requestedFile));
        } else {
            if (!item.mediaFiles || item.mediaFiles.videos.length === 0)
                return res.status(404).send("No video file found");

            const videoPath = item.mediaFiles.videos[0];
            fullPath = path.join(MEDIA_PATH, normalizeMediaPath(videoPath));
        }

        res.download(fullPath, (err) => {
            if (err) {
                console.error("Error sending file:", err);
                res.status(500).send("Error sending file");
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Internal error");
    }
});

app.use("/media", express.static(MEDIA_PATH));

async function getVideoPath(itemId, requestedFile = null) {
    const copyDB = await loadContentWithPaths();
    const item = copyDB.find((i) => i.id === itemId);
    if (!item) return null;

    if (requestedFile) {
        return path.join(MEDIA_PATH, normalizeMediaPath(requestedFile));
    }

    if (!item.mediaFiles || item.mediaFiles.videos.length === 0) return null;

    const videoPath = item.mediaFiles.videos[0];
    return path.join(MEDIA_PATH, normalizeMediaPath(videoPath));
}

async function getTrackInfo(itemId, requestedFile = null) {
    const videoPath = await getVideoPath(itemId, requestedFile);
    if (!videoPath) return null && console.log("!vid");

    return new Promise((resolve) => {
        const ffprobe = spawn("ffprobe", [
            "-v", "quiet",
            "-print_format", "json",
            "-show_streams",
            videoPath
        ]);

        let data = "";
        ffprobe.stdout.on("data", (chunk) => (data += chunk));
        ffprobe.on("close", (code) => {
            if (code !== 0) return resolve(null);
            try {
                const info = JSON.parse(data);
                const streams = info.streams || [];

                const audio = streams
                    .filter((s) => s.codec_type === "audio")
                    .map((s) => ({
                        index: streams.indexOf(s),
                        track: streams.indexOf(s),
                        language: s.tags?.language || "unknown",
                        title: s.tags?.title || `Audio ${streams.indexOf(s) + 1}`,
                        codec: s.codec_name
                    }));

                resolve({ audio });
            } catch {
                resolve(null);
            }
        });
    });
}

app.get("/api/tracks/:id", async (req, res) => {
    try {
        const requestedFile = req.query.file || null;
        const tracks = await getTrackInfo(req.params.id, requestedFile);
        if (!tracks) return res.status(404).json({ error: "Not found" });
        res.json(tracks);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to get tracks" });
    }
});

// Transcoding (no seeking)
// app.get("/stream/:id", async (req, res) => {
//     try {
//         const requestedFile = req.query.file || null;
//         const videoPath = await getVideoPath(req.params.id, requestedFile);
//         if (!videoPath) return res.status(404).send("File not found");

//         const audioTrack = req.query.audio ?? "0";
//         const subtitleTrack = req.query.subtitle ?? "-1";

//         const args = [
//             "-i", videoPath,
//             "-map", "0:v",
//             "-map", `0:a:${audioTrack}`,
//             "-c:v", "copy",
//             "-c:a", "aac"
//         ];

//         if (subtitleTrack !== "-1") {
//             args.push("-map", `0:s:${subtitleTrack}`, "-c:s", "copy");
//         } else {
//             args.push("-map", "-0:s");
//         }

//         args.push(
//             "-f", "mp4",
//             "-movflags", "frag_keyframe+empty_moov",
//             "pipe:1"
//         );

//no transcoding

app.get("/stream/:id", async (req, res) => {
    try {
        const videoPath = await getVideoPath(req.params.id, req.query.file);
        if (!videoPath) return res.status(404).send("File not found");
        
        // Enable range requests for seeking
        res.setHeader("Accept-Ranges", "bytes");
        res.sendFile(videoPath);
    } catch (err) {
        console.error(err);
        res.status(500).send("Internal error");
    }
});

async function getMediaFolderPath(itemId, requestedFile = null) {
    console.log(`[SUBTITLE] getMediaFolderPath called with: ${itemId}, file=${requestedFile}`);
    const copyDB = await loadContentWithPaths();
    const item = copyDB.find((i) => i.id === itemId);
    if (!item || !item.mediaFiles) {
        console.log(`[SUBTITLE] Item not found in DB: ${itemId}`);
        return null;
    }
    return path.join(MEDIA_PATH, item.mediaFiles.folderPath);
}

function getSeasonAndEpisode(filePath) {
    if (!filePath) return null;
    const fileName = filePath.split("/").pop() || "";
    const match = fileName.match(/[Ss](\d{1,2})[Ee](\d{1,2})/);
    if (match) {
        return {
            season: parseInt(match[1], 10),
            episode: parseInt(match[2], 10)
        };
    }
    return null;
}

function getEpisodeIdFromPath(filePath) {
    const se = getSeasonAndEpisode(filePath);
    if (se) {
        return `S${String(se.season).padStart(2, '0')}E${String(se.episode).padStart(2, '0')}`;
    }
    return null;
}

async function getSubtitleCachePath(itemId, lang, requestedFile = null) {
    console.log(`[SUBTITLE] getSubtitleCachePath called: ${itemId}, ${lang}, file=${requestedFile}`);
    const folderPath = await getMediaFolderPath(itemId, requestedFile);
    if (!folderPath) return null;
    
    const episodeId = getEpisodeIdFromPath(requestedFile);
    let vttFileName;
    
    if (episodeId) {
        vttFileName = `${episodeId}_${lang}.vtt`;
    } else {
        vttFileName = `${lang}.vtt`;
    }
    
    const vttPath = path.join(folderPath, "subs", vttFileName);
    console.log(`[SUBTITLE] VTT path: ${vttPath}`);
    return vttPath;
}

function buildSearchQuery(filePath) {
    const fileName = filePath.split("/").pop() || "";
    
    const episodeMatch = fileName.match(/[Ss](\d{1,2})[Ee](\d{1,2})/);
    if (!episodeMatch) return null;
    
    const episode = `S${episodeMatch[1].padStart(2, '0')}E${episodeMatch[2].padStart(2, '0')}`;
    const season = parseInt(episodeMatch[1], 10);
    const epNum = parseInt(episodeMatch[2], 10);
    
    const beforeEpisode = fileName.substring(0, fileName.indexOf(episodeMatch[0])).replace(/[\.\-_]+$/g).replace(/[\.\-_]/g, " ").trim();
    
    return { showName: beforeEpisode, episode, season, epNum };
}

function buildMovieSearchQuery(filePath) {
    const fileName = filePath.split("/").pop() || "";
    const movieName = fileName.replace(/\.(mp4|mkv|avi|mov|webm)$/i, "").replace(/[\.\-_]/g, " ").trim();
    return movieName;
}

async function searchSubtitles(searchQuery, episode, lang) {
    console.log(`[SUBTITLE] searchSubtitles: query="${searchQuery}", episode=${episode}, lang=${lang}`);
    
    const url = `https://api.opensubtitles.com/api/v1/subtitles?query=${encodeURIComponent(searchQuery)}&languages=${lang}`;
    console.log(`[SUBTITLE] OpenSubtitles search URL: ${url}`);

    const response = await fetch(url, {
        headers: {
            "Api-Key": OPENSUBTITLES_API_KEY,
            "User-Agent": "ProjectM v1.0",
            "Accept": "application/json"
        }
    });

    console.log(`[SUBTITLE] OpenSubtitles search status: ${response.status}`);

    if (!response.ok) {
        const text = await response.text();
        console.error(`[SUBTITLE] API error response:`, text);
        throw new Error(`OpenSubtitles API error: ${response.status}`);
    }

    const data = await response.json();
    console.log(`[SUBTITLE] OpenSubtitles search response:`, JSON.stringify(data, null, 2).substring(0, 3000));

    if (!data.data || data.data.length === 0) {
        throw new Error("No subtitles found");
    }

    const matchedResults = data.data
        .map(result => ({
            fileId: result.attributes.files[0].file_id,
            fileName: result.attributes.files[0].file_name,
            downloadCount: result.attributes.download_count || 0
        }))
        .filter(result => result.fileName.includes(episode))
        .sort((a, b) => b.downloadCount - a.downloadCount);

    if (matchedResults.length === 0) {
        console.log(`[SUBTITLE] No results matching episode ${episode}`);
        throw new Error("No subtitles found for episode");
    }

    const bestMatch = matchedResults[0];
    console.log(`[SUBTITLE] Selected subtitle: ${bestMatch.fileName} (${bestMatch.downloadCount} downloads)`);

    return bestMatch.fileId;
}

async function downloadSubtitle(fileId) {
    console.log(`[SUBTITLE] downloadSubtitle: fileId=${fileId}`);
    const response = await fetch("https://api.opensubtitles.com/api/v1/download", {
        method: "POST",
        headers: {
            "Api-Key": OPENSUBTITLES_API_KEY,
            "User-Agent": "ProjectM v1.0",
            "Content-Type": "application/json",
            "Accept": "application/json"
        },
        body: JSON.stringify({ file_id: fileId })
    });

    console.log(`[SUBTITLE] OpenSubtitles download status: ${response.status}`);

    if (!response.ok) {
        throw new Error(`OpenSubtitles download error: ${response.status}`);
    }

    const data = await response.json();
    console.log(`[SUBTITLE] Download link received: ${data.link}`);

    return data.link;
}

async function fetchSubtitleFromOpenSubtitles(searchQuery, episode, lang) {
    console.log(`[SUBTITLE] fetchSubtitleFromOpenSubtitles: query="${searchQuery}", episode=${episode}, lang=${lang}`);
    const fileId = await searchSubtitles(searchQuery, episode, lang);
    const downloadLink = await downloadSubtitle(fileId);
    return downloadLink;
}

function srtToVtt(srtContent) {
    const lines = srtContent.split("\n");
    const vttLines = ["WEBVTT", ""];
    
    for (const line of lines) {
        vttLines.push(line);
    }
    
    return vttLines.join("\n");
}

async function downloadAndConvertToVTT(subtitleUrl, vttPath) {
    console.log(`[SUBTITLE] downloadAndConvertToVTT: ${subtitleUrl} -> ${vttPath}`);
    const subsDir = path.dirname(vttPath);
    await fs.mkdir(subsDir, { recursive: true });

    const response = await fetch(subtitleUrl);
    if (!response.ok) {
        throw new Error(`Failed to download subtitle: ${response.status}`);
    }

    const srtContent = await response.text();
    
    const vttContent = srtToVtt(srtContent);
    await fs.writeFile(vttPath, vttContent);
    console.log(`[SUBTITLE] VTT created: ${vttPath}`);

    return vttPath;
}

app.get("/api/subtitles/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const lang = req.query.lang || "en";
        const requestedFile = req.query.file || null;
        console.log(`[SUBTITLE] /api/subtitles/${id}?lang=${lang}&file=${requestedFile}`);

        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Content-Type", "text/vtt");

        const vttPath = await getSubtitleCachePath(id, lang, requestedFile);
        if (!vttPath) {
            console.log(`[SUBTITLE] Media not found`);
            return res.status(404).json({ error: "Media not found" });
        }

        try {
            await fs.access(vttPath);
            console.log(`[SUBTITLE] Returning cached VTT: ${vttPath}`);
            return res.sendFile(vttPath);
        } catch {
            console.log(`[SUBTITLE] VTT not cached, fetching from OpenSubtitles...`);
        }

        const tmdbId = id.replace(/^(movie|tv)-/, "");
        const isTvShow = id.startsWith("tv-");
        
        let searchQuery;
        let episode = null;

        if (isTvShow) {
            const searchData = buildSearchQuery(requestedFile);
            if (!searchData) {
                console.log(`[SUBTITLE] Could not extract episode info from filename`);
                return res.status(400).json({ error: "Could not extract episode info from filename" });
            }
            
            console.log(`[SUBTITLE] TV Show detected: ${searchData.showName} ${searchData.episode}`);
            
            const episodeName = await getEpisodeName(tmdbId, searchData.season, searchData.epNum);
            searchQuery = `${searchData.showName} ${searchData.episode} ${episodeName}`;
            episode = searchData.episode;
            
            console.log(`[SUBTITLE] Full search query: "${searchQuery}", Episode: ${episode}`);
        } else {
            searchQuery = buildMovieSearchQuery(requestedFile);
            console.log(`[SUBTITLE] Movie detected, search query: "${searchQuery}"`);
        }
        
        const subtitleUrl = await fetchSubtitleFromOpenSubtitles(searchQuery, episode, lang);
        console.log(`[SUBTITLE] Got subtitle URL: ${subtitleUrl}`);
        
        const savedPath = await downloadAndConvertToVTT(subtitleUrl, vttPath);
        console.log(`[SUBTITLE] Saved and returning: ${savedPath}`);
        
        res.sendFile(savedPath);

    } catch (err) {
        console.error("[SUBTITLE] Error:", err.message, err.stack);
        res.status(500).json({ error: "Failed to fetch subtitle: " + err.message });
    }
});

app.get("/api/subtitles-available/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const requestedFile = req.query.file || null;
        console.log(`[SUBTITLE] /api/subtitles-available/${id}?file=${requestedFile}`);
        const langs = ["en", "fr"];
        const available = [];

        for (const lang of langs) {
            const vttPath = await getSubtitleCachePath(id, lang, requestedFile);
            
            if (vttPath) {
                try {
                    await fs.access(vttPath);
                    console.log(`[SUBTITLE] Found cached VTT for ${lang}: ${vttPath}`);
                    available.push({ lang, cached: true });
                } catch {
                    console.log(`[SUBTITLE] No subtitle for ${lang}`);
                    available.push({ lang, cached: false });
                }
            } else {
                console.log(`[SUBTITLE] No path found for ${lang}`);
                available.push({ lang, cached: false });
            }
        }

        console.log(`[SUBTITLE] Returning available:`, available);
        res.json(available);
    } catch (err) {
        console.error("[SUBTITLE] Check error:", err);
        res.status(500).json({ error: "Failed to check subtitles" });
    }
});

app.listen(3000, () => console.log("Express running on port 3000"));
