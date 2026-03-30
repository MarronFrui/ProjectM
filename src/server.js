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



app.use("/media", express.static(MEDIA_PATH));

app.listen(3000, () => console.log("Express running on port 3000"));
