import { supabase } from "./src/supabase";

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
    const { data, error } = await supabase.from("content").select("*");
    if (error) throw new Error(error.message);
    return data.map((item: any) => ({
        ...item,
        filePath: item.file_path,
        releaseYear: item.release_year,
    }));
}