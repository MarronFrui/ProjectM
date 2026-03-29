
import { Router } from "express";
import fs from "fs/promises";

const router = Router();

const DB_PATH = "./content-info/contentDB.json";
const MEDIA_PATH = "/mnt/media";

function normalize(str: string) {
    return str.toLowerCase().replace(/[^a-z0-9]/g, "");
}

router.get("/content", async (req, res) => {
    try {
        const raw = await fs.readFile(DB_PATH, "utf-8");
        const db = JSON.parse(raw);

        const files = await fs.readdir(MEDIA_PATH);
        const availableSet = new Set(files.map(normalize));

        const merged = db.map((item: any) => ({
            ...item,
            available: availableSet.has(normalize(item.name)),
        }));

        res.json(merged);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "failed" });
    }
});

export default router;