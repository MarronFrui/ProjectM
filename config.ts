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
  const res = await fetch(`${import.meta.env.VITE_API_URL}/api/content-availability`);
  if (!res.ok) throw new Error("Failed to load content availability");
  return res.json();
}
