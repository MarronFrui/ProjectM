export interface ContentItem {
    id: string;
    imdbID: string; 
    name: string;
    description: string;
    category: "Film" | "Serie" | "Documentaire";
    available: boolean;
    duration: number;
    seasons: number | null;
    episodes: number | null;
    filePath?: string; 
    poster?: string; 
}

// ======= Content Dataset =======
export let contentDB: ContentItem[] = [];

export async function loadContentDB() {
    const res = await fetch("./content-info/contentDB.json");
    if (!res.ok) throw new Error("Failed to load contentDB.json");
    contentDB = await res.json();
}