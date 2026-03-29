import { Router } from "express";
import fs from "fs/promises";
import { createClient } from "@supabase/supabase-js";

const router = Router();

const MEDIA_PATH = "/mnt/media";

const supabase = createClient(
    "http://192.168.5.67:8000",
    process.env.SERVICE_ROLE_KEY!
);

function normalize(str: string) {
    return str.toLowerCase().replace(/[^a-z0-9]/g, "");
}

router.post("/scan", async (req, res) => {
    try {
        const files = await fs.readdir(MEDIA_PATH);
        const { data: items } = await supabase
            .from("content")
            .select("id, name, file_path");

        for (const item of items ?? []) {
            const match = files.find((f) =>
                normalize(f).includes(normalize(item.name))
            );
            if (match) {
                await supabase
                    .from("content")
                    .update({
                        available: true,
                        file_path: `${MEDIA_PATH}/${match}`,
                    })
                    .eq("id", item.id);
            }
        }

        res.json({ scanned: files.length });
    } catch (err) {
        res.status(500).json({ error: "scan failed" });
    }
});

export default router;