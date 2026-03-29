import express from "express";
import fs from "fs/promises";
import type { ContentItem } from "../config"; // only for TS typing

import contentDBRaw from "../content-info/contentDB.json" with { type: "json" };

const router = express.Router();
const MEDIA_PATH = "/mnt/media";

function normalize(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]/g, "");
}

const contentDB: ContentItem[] = contentDBRaw;

router.get("/content-availability", async (req, res) => {
  try {
    const files = await fs.readdir(MEDIA_PATH);

    const itemsWithAvailability: ContentItem[] = contentDB.map(item => {
      const exists = files.some(f => normalize(f).includes(normalize(item.name)));
      return { ...item, available: exists };
    });

    res.json(itemsWithAvailability);
  } catch (err) {
    console.error("Availability check failed:", err);
    res.status(500).json({ error: "Failed to check availability" });
  }
});

export default router;