import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ContentItem } from "../../config";
import { useContent } from "./ContentProvider";
import { useWishlist } from "./WatchlistProvider";
import CardsGrid from "./CardsGrid";
import PreviewModal from "./PreviewModal";
import NavBar from "./NavBar";
import { useDirectionalNavigation } from "../../hooks/useDirectionalNavigation";

export default function WishlistPage() {
    const navigate = useNavigate();
    const { content, loading } = useContent();
    const { wishlist, toggleWishlist } = useWishlist();
    const {
        register,
        focusFirst,
        setModalOpen,
        setEscapeHandler,
        registerModal,
        focusFirstModal,
        setLastFocused,
    } = useDirectionalNavigation();

    const [selected, setSelected] = useState<ContentItem | null>(null);

    const wishlistItems = content.filter((item) => wishlist.includes(item.id));

    const handleSelect = (item: ContentItem) => {
        setLastFocused(document.activeElement as HTMLElement);
        setSelected(item);
        setModalOpen(true);
    };

    const handleClose = () => {
        setSelected(null);
        setModalOpen(false);
    };

    useEffect(() => {
        setEscapeHandler(handleClose);
    }, [selected]);

    // Focus the first card once items exist (replaces the old dead-local-state
    // gate that never fired because the wishlist was never populated).
    const hasInitialized = useRef(false);
    useEffect(() => {
        if (!hasInitialized.current && wishlistItems.length > 0) {
            hasInitialized.current = true;
            requestAnimationFrame(focusFirst);
        }
    }, [wishlistItems.length]);

    return (
        <>
            <NavBar register={register} />

            <main className="page">
                <section className="section" aria-label="Wishlist">
                    <h1 className="section-title">
                        My Wishlist
                        {wishlistItems.length > 0 && (
                            <span className="section-count">
                                {wishlistItems.length}{" "}
                                {wishlistItems.length === 1 ? "title" : "titles"}
                            </span>
                        )}
                    </h1>

                    {loading && (
                        <div className="empty-state" aria-live="polite">
                            <p>Loading your library…</p>
                        </div>
                    )}

                    {!loading && wishlistItems.length > 0 && (
                        <CardsGrid
                            items={wishlistItems}
                            onSelect={handleSelect}
                            wishlist={wishlist}
                            toggleWishlist={toggleWishlist}
                            register={register}
                            baseRow={1}
                        />
                    )}

                    {!loading && wishlistItems.length === 0 && (
                        <div className="empty-state">
                            <div className="empty-state-icon" aria-hidden="true">
                                ♡
                            </div>
                            <h2 className="empty-state-title">
                                Your wishlist is empty
                            </h2>
                            <p className="empty-state-text">
                                Tap the heart on any unavailable title and it
                                will wait for you here.
                            </p>
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={() => navigate("/")}
                            >
                                Browse titles
                            </button>
                        </div>
                    )}
                </section>
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
