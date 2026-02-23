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

export async function loadContentDB(): Promise<ContentItem[]> {
  const res = await fetch("/content-info/contentDB.json");
  if (!res.ok) throw new Error("Failed to load contentDB.json");
  return res.json();
}
