import express from "express";
import cors from "cors";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

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

app.listen(3000, () => console.log("Express running on port 3000"));
