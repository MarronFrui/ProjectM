import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ContentItem, formatRuntime } from "../server/config";

interface Props {
    item: ContentItem;
    onClose: () => void;
    wishlist: string[];
    toggleWishlist: (id: string) => void;
    registerModal: (el: HTMLElement | null) => void;
    focusFirstModal: () => void;
}

export default function PreviewModal({
    item,
    onClose,
    wishlist,
    toggleWishlist,
    registerModal,
    focusFirstModal,
}: Props) {
    const navigate = useNavigate();
    const wished = wishlist.includes(item.id);

    useEffect(() => {
        focusFirstModal();
    }, []);

    // Global Escape so closing works even when focus moved off the dialog.
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [onClose]);

    // Lock page scroll behind the dialog.
    useEffect(() => {
        document.body.classList.add("modal-open");
        return () => document.body.classList.remove("modal-open");
    }, []);

    const handlePlay = () => {
        navigate(`/player/${item.id}`);
    };

    return (
        <div
            className="modal-overlay active"
            onClick={onClose}
            role="presentation"
        >
            <div
                id="preview-content"
                className="modal-panel"
                role="dialog"
                aria-modal="true"
                aria-labelledby="preview-name"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    type="button"
                    ref={registerModal}
                    id="close-preview"
                    className="modal-close"
                    onClick={onClose}
                    aria-label="Close preview"
                >
                    ✕
                </button>

                <img
                    id="preview-image"
                    className="modal-poster"
                    src={item.poster ?? "./content-info/poster/default.jpg"}
                    alt={item.name}
                />

                <h2 id="preview-name" className="modal-title">
                    {item.name}
                </h2>

                <p className="modal-meta">
                    {formatRuntime(item)}
                    {item.releaseYear ? ` · ${item.releaseYear}` : ""}
                </p>

                <p id="preview-description" className="modal-description">
                    {item.description}
                </p>

                <div className="modal-actions">
                    {item.available ? (
                        <button
                            type="button"
                            ref={registerModal}
                            id="play-button"
                            className="btn btn-primary"
                            onClick={handlePlay}
                        >
                            ▶ Play
                        </button>
                    ) : (
                        <button
                            type="button"
                            ref={registerModal}
                            id="add-to-wishlist"
                            className={`btn ${
                                wished ? "btn-ghost" : "btn-primary"
                            }`}
                            aria-pressed={wished}
                            onClick={() => toggleWishlist(item.id)}
                        >
                            {wished
                                ? "✓ In wishlist — remove"
                                : "♡ Add to wishlist"}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
