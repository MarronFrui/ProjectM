export interface ContentItem {
    id: string;
    name: string;
    description: string;
    category: "Film" | "Serie" | "Documentaire";
    available: boolean;
    duration: number;
    seasons: number | null;
    episodes: number | null;
    filePath?: string; 
}

// ======= Content Dataset =======
export const contentDB: ContentItem[] = new Array(200).fill(null).map(
    (_, i): ContentItem => ({
        id: `item-${i + 1}`,
        name: `title ${i}`,
        description: `Description of title ${i}. Lorem ipsum dolor sit amet, consectetur adipiscing elit.`,
        category: ["Film", "Serie", "Documentaire"][
            i % 3
        ] as ContentItem["category"],
        available: Math.random() > 0.5,
        duration: 80 + Math.floor(Math.random() * 101),
        seasons: i % 3 === 1 ? 1 + Math.floor(Math.random() * 5) : null,
        episodes: i % 3 === 1 ? 6 + Math.floor(Math.random() * 15) : null,
        filePath: `./content_info/${i + 1}/video.mp4`
    })
);