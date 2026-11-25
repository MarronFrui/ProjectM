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

/** "128 min" or "3 seasons · 61 episodes", singular-aware. */
export function formatRuntime(
  item: Pick<ContentItem, 'seasons' | 'episodes' | 'duration'>,
): string {
  if (item.seasons === null) return `${item.duration} min`;
  if (item.seasons === 1) return `1 season · ${item.episodes} episodes`;
  return `${item.seasons} seasons · ${item.episodes} episodes`;
}

export async function loadContentDB(): Promise<ContentItem[]> {
  const res = await fetch(`${import.meta.env.VITE_API_URL}/api/content-availability`);
  if (!res.ok) throw new Error('Failed to load content availability');
  return res.json();
}
