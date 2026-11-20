import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { ContentItem } from "../server/config";
import CardsGrid from "./CardsGrid";
import PreviewModal from "./PreviewModal";
import NavBar from "./NavBar";
import { useDirectionalNavigation } from "../../hooks/useDirectionalNavigation";
import { useContent } from "./ContentProvider";
import { useWishlist } from "./WatchlistProvider";

const CARD_ROWS = 2;
const SKELETON_TILES = 10;

function SkeletonRow() {
    return (
        <div className="skeleton-row" aria-hidden="true">
            {Array.from({ length: SKELETON_TILES }, (_, i) => (
                <div className="skeleton-card" key={i}>
                    <div className="skeleton-poster" />
                    <div className="skeleton-line" />
                    <div className="skeleton-line short" />
                </div>
            ))}
        </div>
    );
}

export default function HomePage() {
    const { content, loading, error } = useContent();
    const { wishlist, toggleWishlist } = useWishlist();
    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState<ContentItem | null>(null);
    const { genre } = useParams();
    const navigate = useNavigate();

    const {
        register,
        setModalOpen,
        focusFirst,
        setEscapeHandler,
        registerModal,
        focusFirstModal,
        setLastFocused,
    } = useDirectionalNavigation();

    const handleSelect = (item: ContentItem) => {
        setLastFocused(document.activeElement as HTMLElement);
        setSelected(item);
        setModalOpen(true);
    };

    const handleClose = () => {
        setSelected(null);
        setModalOpen(false);
    };

    // useMemo keeps these arrays stable between renders so CardsGrid does not
    // reset its virtualization window on every keystroke or re-render.
    const filtered = useMemo(() => {
        const needle = search.trim().toLowerCase();
        return content.filter((item) => {
            const matchesSearch = item.name.toLowerCase().includes(needle);
            const matchesGenre = genre
                ? item.category.includes(decodeURIComponent(genre))
                : true;
            return matchesSearch && matchesGenre;
        });
    }, [content, search, genre]);

    const available = useMemo(
        () => filtered.filter((i) => i.available),
        [filtered],
    );
    const unavailable = useMemo(
        () => filtered.filter((i) => !i.available),
        [filtered],
    );
    const availableRowCount = available.length > 0 ? CARD_ROWS : 0;
    const unavailableBaseRow = 1 + availableRowCount;

    const hasInitialized = useRef(false);

    useEffect(() => {
        if (
            !hasInitialized.current &&
            (available.length > 0 || unavailable.length > 0)
        ) {
            hasInitialized.current = true;
            requestAnimationFrame(focusFirst);
        }
    }, [available.length, unavailable.length]);

    useEffect(() => {
        setEscapeHandler(handleClose);
    }, [selected]);

    const browsingGenre = genre ? decodeURIComponent(genre) : null;
    const hasResults = available.length > 0 || unavailable.length > 0;

    return (
        <>
            <NavBar
                register={register}
                search={search}
                onSearchChange={setSearch}
            />

            <main className="page">
                {browsingGenre && (
                    <section className="section" aria-label="Active genre filter">
                        <h1 className="section-title">
                            {browsingGenre}
                            <button
                                type="button"
                                className="btn btn-ghost"
                                onClick={() => navigate("/")}
                            >
                                Show all
                            </button>
                        </h1>
                    </section>
                )}

                {loading && (
                    <>
                        <section className="section" aria-label="Loading titles">
                            <h2 className="section-title">Available</h2>
                            <SkeletonRow />
                        </section>
                        <section className="section" aria-label="Loading titles">
                            <h2 className="section-title">Unavailable</h2>
                            <SkeletonRow />
                        </section>
                    </>
                )}

                {error && (
                    <div className="error-state" role="alert">
                        <h2 className="error-state-title">
                            Couldn&apos;t load your library
                        </h2>
                        <p>Check that the media server is running, then try again.</p>
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => window.location.reload()}
                        >
                            Retry
                        </button>
                    </div>
                )}

                {!loading && !error && !hasResults && (
                    <div className="empty-state">
                        <div className="empty-state-icon" aria-hidden="true">
                            🔍
                        </div>
                        <h2 className="empty-state-title">No titles found</h2>
                        <p className="empty-state-text">
                            {search
                                ? `Nothing matches “${search}”.`
                                : "This genre has no titles yet."}
                        </p>
                        {search && (
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={() => setSearch("")}
                            >
                                Clear search
                            </button>
                        )}
                    </div>
                )}

                {!loading && !error && available.length > 0 && (
                    <section className="section" aria-label="Available titles">
                        <h2 className="section-title">
                            Available
                            <span className="section-count">
                                {available.length}{" "}
                                {available.length === 1 ? "title" : "titles"}
                            </span>
                        </h2>
                        <CardsGrid
                            items={available}
                            searchActive={search.trim().length > 0}
                            onSelect={handleSelect}
                            wishlist={wishlist}
                            toggleWishlist={toggleWishlist}
                            register={register}
                            baseRow={1}
                        />
                    </section>
                )}

                {!loading && !error && unavailable.length > 0 && (
                    <section className="section" aria-label="Unavailable titles">
                        <h2 className="section-title">
                            Unavailable
                            <span className="section-count">
                                {unavailable.length}{" "}
                                {unavailable.length === 1 ? "title" : "titles"}
                            </span>
                        </h2>
                        <CardsGrid
                            items={unavailable}
                            searchActive={search.trim().length > 0}
                            onSelect={handleSelect}
                            wishlist={wishlist}
                            toggleWishlist={toggleWishlist}
                            register={register}
                            baseRow={unavailableBaseRow}
                        />
                    </section>
                )}
            </main>

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
        </>
    );
}
