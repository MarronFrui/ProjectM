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
console.log("Resolved DB path:", DB_PATH);

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
    if (!videoPath) return null && console.log("!videopath");

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

                const subtitles = streams
                    .filter((s) => s.codec_type === "subtitle")
                    .map((s, i) => ({
                        index: i,
                        track: streams.filter(sub => s.codec_type === "subtitle").indexOf(s),
                        language: s.tags?.language || "unknown",
                        title: s.tags?.title || `Subtitle ${i + 1}`,
                        codec: s.codec_name
                    }));

                resolve({ audio, subtitles });
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
            "-re",
            "-i", videoPath,
            "-map", "0:v",
            "-map", `0:a:${audioTrack}`,
            "-c:v", "copy"
        ];

        if (subtitleTrack !== "-1") {
            args.push("-map", `0:s:${subtitleTrack}`);
        } else {
            args.push("-map", "-0:s");
        }

        args.push(
            "-c:a", "aac",
            "-c:s", "webvtt",
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

app.listen(3000, () => console.log("Express running on port 3000"));
