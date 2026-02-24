import { useEffect, useState } from "react";
import { loadContentDB, ContentItem } from "../../config";
import CardsGrid from "./CardsGrid";
import PreviewModal from "./PreviewModal";

export default function HomePage() {
    const [content, setContent] = useState<ContentItem[]>([]);
    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState<ContentItem | null>(null);
    const [wishlist, setWishlist] = useState<string[]>([]);

    useEffect(() => {
        loadContentDB().then((items) =>
            setContent(
                items.map((item) => ({
                    ...item,
                    available: Math.random() > 0.5,
                })),
            ),
        );
    }, []);

    const filtered = content.filter((item) =>
        item.name.toLowerCase().includes(search.toLowerCase()),
    );

    const available = filtered.filter((i) => i.available);
    const unavailable = filtered.filter((i) => !i.available);

    const toggleWishlist = (id: string) => {
        setWishlist((prev) =>
            prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
        );
    };

    return (
        <>
            <header>
                <h1>Homemade Netflix</h1>
            </header>

            <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
            />

            <h2>Available</h2>
            <CardsGrid
                items={available}
                onSelect={setSelected}
                wishlist={wishlist}
                toggleWishlist={toggleWishlist}
            />

            <h2>Unavailable</h2>
            <CardsGrid
                items={unavailable}
                onSelect={setSelected}
                wishlist={wishlist}
                toggleWishlist={toggleWishlist}
            />

            {selected && (
                <PreviewModal
                    item={selected}
                    onClose={() => setSelected(null)}
                    wishlist={wishlist}
                    toggleWishlist={toggleWishlist}
                />
            )}
        </>
    );
}
