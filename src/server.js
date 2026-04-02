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
let OPENSUBTITLES_API_KEY = "";
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

console.log("Resolved DB path:", DB_PATH);
console.log("OpenSubtitles API Key loaded:", OPENSUBTITLES_API_KEY ? "Yes" : "No");

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

app.get("/api/content-availability", async (req, res) => {
    try {
        const raw = await fs.readFile(DB_PATH, "utf-8");
        const contentDB = JSON.parse(raw);
        const files = await fs.readdir(MEDIA_PATH);

        const items = contentDB.map((item) => {
            const match = files.find((f) => matches(f, item.name));

            return {
                ...item,
                available: !!match,
                filePath: match ? `/media/${match}` : null,
            };
        });

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

    const updatedDb = contentDB.map((item) => {
        const match = files.find((f) => matches(f, item.name));
        return {
            ...item,
            filePath: match ? `/media/${match}` : null,
        };
    });

    return updatedDb;
}

app.get("/media/:id", async (req, res) => {
    try {
        const copyDB = await loadContentWithPaths(); 
        const item = copyDB.find(i => i.id === req.params.id);

        if (!item || !item.filePath)
            return res.status(404).send("File not found");

        // The folder where the media is stored
        const folderName = path.basename(item.filePath);
        const folderPath = path.join(MEDIA_PATH, folderName);

        // Read all files in the folder
        const files = await fs.readdir(folderPath);

        const videoFile = files.find(f =>
            /\.(mp4|mkv|avi|mov|webm)$/i.test(f)
        );

        if (!videoFile) return res.status(404).send("No video file found");

        const fullPath = path.join(folderPath, videoFile);

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

async function getVideoPath(itemId) {
    const copyDB = await loadContentWithPaths();
    const item = copyDB.find((i) => i.id === itemId);
    if (!item || !item.filePath) return null;

    const folderPath = path.join(MEDIA_PATH, path.basename(item.filePath));
    const files = await fs.readdir(folderPath);
    const videoFile = files.find((f) => /\.(mp4|mkv|avi|mov|webm)$/i.test(f));

    return videoFile ? path.join(folderPath, videoFile) : null;
}

async function getTrackInfo(itemId) {
    const videoPath = await getVideoPath(itemId);
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
                    .map((s, i) => ({
                        index: i,
                        track: streams.filter(a => a.codec_type === "audio").indexOf(s),
                        language: s.tags?.language || "unknown",
                        title: s.tags?.title || `Audio ${i + 1}`,
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
        const tracks = await getTrackInfo(req.params.id);
        if (!tracks) return res.status(404).json({ error: "Not found" });
        res.json(tracks);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to get tracks" });
    }
});

app.get("/stream/:id", async (req, res) => {
    try {
        const videoPath = await getVideoPath(req.params.id);
        if (!videoPath) return res.status(404).send("File not found");

        const audioTrack = req.query.audio ?? "0";
        const subtitleTrack = req.query.subtitle ?? "-1";

        const args = [
            "-i", videoPath,
            "-map", "0:v",
            "-map", `0:a:${audioTrack}`,
            "-c:v", "copy",
            "-c:a", "aac"
        ];

        if (subtitleTrack !== "-1") {
            args.push("-map", `0:s:${subtitleTrack}`, "-c:s", "copy");
        } else {
            args.push("-map", "-0:s");
        }

        args.push(
            "-f", "mp4",
            "-movflags", "frag_keyframe+empty_moov",
            "pipe:1"
        );

        const ffmpeg = spawn("ffmpeg", args);

        res.setHeader("Content-Type", "video/mp4");
        res.setHeader("Transfer-Encoding", "chunked");
        res.setHeader("Accept-Ranges", "none");

        ffmpeg.stdout.pipe(res);
        ffmpeg.stderr.on("data", (d) => console.log("ffmpeg:", d.toString()));

        ffmpeg.on("error", (err) => {
            console.error("ffmpeg error:", err);
            if (!res.headersSent) res.status(500).send("Transcode error");
        });

        req.on("close", () => ffmpeg.kill());
    } catch (err) {
        console.error(err);
        res.status(500).send("Internal error");
    }
});

async function getMediaFolderPath(itemId) {
    console.log(`[SUBTITLE] getMediaFolderPath called with: ${itemId}`);
    const copyDB = await loadContentWithPaths();
    const item = copyDB.find((i) => i.id === itemId);
    if (!item || !item.filePath) {
        console.log(`[SUBTITLE] Item not found in DB: ${itemId}`);
        return null;
    }
    const folderPath = path.join(MEDIA_PATH, path.basename(item.filePath));
    console.log(`[SUBTITLE] Media folder: ${folderPath}`);
    return folderPath;
}

async function getSubtitleCachePath(itemId, lang) {
    console.log(`[SUBTITLE] getSubtitleCachePath called: ${itemId}, ${lang}`);
    const folderPath = await getMediaFolderPath(itemId);
    if (!folderPath) return null;
    const vttPath = path.join(folderPath, "subs", `${lang}.vtt`);
    console.log(`[SUBTITLE] VTT path: ${vttPath}`);
    return vttPath;
}

async function searchSubtitles(tmdbId, lang) {
    console.log(`[SUBTITLE] searchSubtitles: tmdbId=${tmdbId}, lang=${lang}`);
    const url = `https://api.opensubtitles.com/api/v1/subtitles?tmdb_id=${tmdbId}&languages=${lang}`;
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
    console.log(`[SUBTITLE] OpenSubtitles search response:`, JSON.stringify(data, null, 2).substring(0, 1000));

    if (!data.data || data.data.length === 0) {
        throw new Error("No subtitles found");
    }

    const firstResult = data.data[0];
    const fileId = firstResult?.attributes?.files?.[0]?.file_id;
    
    if (!fileId) {
        throw new Error("No file_id in search results");
    }

    return fileId;
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

async function fetchSubtitleFromOpenSubtitles(tmdbId, lang) {
    console.log(`[SUBTITLE] fetchSubtitleFromOpenSubtitles: tmdbId=${tmdbId}, lang=${lang}`);
    const fileId = await searchSubtitles(tmdbId, lang);
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
        console.log(`[SUBTITLE] /api/subtitles/${id}?lang=${lang}`);

        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Content-Type", "text/vtt");

        const vttPath = await getSubtitleCachePath(id, lang);
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
        console.log(`[SUBTITLE] TMDB ID: ${tmdbId}`);
        
        const subtitleUrl = await fetchSubtitleFromOpenSubtitles(tmdbId, lang);
        console.log(`[SUBTITLE] Got subtitle URL: ${subtitleUrl}`);
        
        const savedPath = await downloadAndConvertToVTT(subtitleUrl, vttPath);
        console.log(`[SUBTITLE] Saved and returning: ${savedPath}`);
        
        res.sendFile(savedPath);

    } catch (err) {
        console.error("[SUBTITLE] Error:", err.message);
        res.status(500).json({ error: "Failed to fetch subtitle" });
    }
});

app.get("/api/subtitles-available/:id", async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`[SUBTITLE] /api/subtitles-available/${id}`);
        const langs = ["en", "fr"];
        const available = [];

        for (const lang of langs) {
            const vttPath = await getSubtitleCachePath(id, lang);
            
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
