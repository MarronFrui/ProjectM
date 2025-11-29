export interface ContentItem {
    id: string;
    name: string;
    description: string;
    category: string[];
    available: boolean;
    duration: number;
    rating: number;
    seasons: number | null;
    episodes: number | null;
    poster: string; 
    filePath?: string; 
    releaseYear?: number | null;
}

// ======= Content Dataset =======
export let contentDB: ContentItem[] = [];

export async function loadContentDB() {
    const res = await fetch("./content-info/contentDB.json");
    if (!res.ok) throw new Error("Failed to load contentDB.json");
    contentDB = await res.json();
}