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

    const {
        register,
        setModalOpen,
        focusFirst,
        setEscapeHandler,
        registerModal,
        focusFirstModal,
        setLastFocused,
    } = useDirectionalNavigation()
    const handleSelect = (item: ContentItem) => {
        setLastFocused(document.activeElement as HTMLElement);
        setSelected(item);
        setModalOpen(true);
    };

    const handleClose = () => {
        setSelected(null);
        setModalOpen(false);
    };

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
    const CARD_ROWS = 2;
    const availableRowCount = available.length > 0 ? CARD_ROWS : 0;
    const unavailableBaseRow = 1 + availableRowCount;

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

    useEffect(() => {
        if (available.length > 0 || unavailable.length > 0) {
            requestAnimationFrame(focusFirst);
        }
    }, [available.length, unavailable.length]);

    useEffect(() => {
        setEscapeHandler(handleClose);
    }, [selected]);

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
                    ref={(el) => register("search", el, 0, 0)}
                />
            </div>

            <h2>Available</h2>
            <CardsGrid
                items={available}
                onSelect={handleSelect}
                wishlist={wishlist}
                toggleWishlist={toggleWishlist}
                register={register}
                baseRow={1}
            />

            <h2>Unavailable</h2>
            <CardsGrid
                items={unavailable}
                onSelect={handleSelect}
                wishlist={wishlist}
                toggleWishlist={toggleWishlist}
                register={register}
                baseRow={unavailableBaseRow}
            />

            {selected && (
                <PreviewModal
                    item={selected}
                    onClose={handleClose}
                    wishlist={wishlist}
                    toggleWishlist={toggleWishlist}
                    registerModal={registerModal}
                    focusFirstModal={focusFirstModal}
                />
            )}
            <Menu register={register} />
        </>
    );
}
