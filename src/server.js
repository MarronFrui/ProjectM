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
    return str.toLowerCase().replace(/[^a-z0-9]/g, "");
}

app.get("/api/content-availability", async (req, res) => {
    try {
        const raw = await fs.readFile(DB_PATH, "utf-8");
        const contentDB = JSON.parse(raw);
        const files = await fs.readdir(MEDIA_PATH);

        const items = contentDB.map((item) => ({
            ...item,
            available: files.some((f) =>
                normalize(f).includes(normalize(item.name))
            ),
        }));

        res.json(items);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "failed" });
    }
});

app.listen(3000, () => console.log("Express running on port 3000"));