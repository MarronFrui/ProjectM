import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { loadContentDB, ContentItem } from "../../config";
import CardsGrid from "./CardsGrid";
import PreviewModal from "./PreviewModal";
import Menu from "../components/Menu";
import { useDirectionalNavigation } from "../../hooks/useDirectionalNavigation";

export default function HomePage() {
    const [content, setContent] = useState<ContentItem[]>([]);
    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState<ContentItem | null>(null);
    const [wishlist, setWishlist] = useState<string[]>([]);
    const { genre } = useParams();
    const { register } = useDirectionalNavigation();

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

    const filtered = content.filter((item) => {
        const matchesSearch = item.name
            .toLowerCase()
            .includes(search.toLowerCase());

        const matchesGenre = genre
            ? item.category.includes(decodeURIComponent(genre))
            : true;

        return matchesSearch && matchesGenre;
    });
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
            <div className="search-container">
                <input
                    id="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search..."
                />
            </div>
            <h2>Available</h2>
            <>
                <CardsGrid
                    items={available}
                    onSelect={setSelected}
                    wishlist={wishlist}
                    toggleWishlist={toggleWishlist}
                    register={register}
                />
            <h2>Unavailable</h2>
                <CardsGrid
                    items={unavailable}
                    onSelect={setSelected}
                    wishlist={wishlist}
                    toggleWishlist={toggleWishlist}
                    register={register}
                />

            </>
            {selected && (
                <PreviewModal
                    item={selected}
                    onClose={() => setSelected(null)}
                    wishlist={wishlist}
                    toggleWishlist={toggleWishlist}
                />
            )}
            <Menu />
        </>
    );
}
