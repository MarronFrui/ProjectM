import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const supabase = createClient(
    "http://192.168.5.67:8000",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3NzQxODk5NDYsImV4cCI6MTkzMTg2OTk0Nn0.xuzTKgrZs-s80hxULD3fn4UC6wmVr8MwM82BonHswko"
);

const items = JSON.parse(
    readFileSync("./content-info/contentDB.json", "utf-8")
);

const mapped = items.map((item: any) => ({
    id: item.id,
    name: item.name,
    description: item.description,
    category: item.category,
    available: false, // Express scanner sets this later
    duration: item.duration,
    rating: item.rating,
    seasons: item.seasons,
    episodes: item.episodes,
    poster: item.poster,
    file_path: item.filePath ?? null,
    release_year: item.releaseYear ?? null,
}));

const { error } = await supabase.from("content").upsert(mapped);

if (error) {
    console.error("Migration failed:", error);
} else {
    console.log(`Migrated ${mapped.length} items successfully`);
}