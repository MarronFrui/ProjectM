import { ContentItem, formatRuntime } from "../server/config";
import { forwardRef, KeyboardEvent } from "react";

interface Props {
    item: ContentItem;
    onSelect: () => void;
    wishlist: string[];
    toggleWishlist: (id: string) => void;
    onFocus?: () => void;
}

const Card = forwardRef<HTMLDivElement, Props>(
    ({ item, onSelect, wishlist, toggleWishlist, onFocus }, ref) => {
        const wished = wishlist.includes(item.id);

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect();
            }
        };

        return (
            <div
                className="card"
                role="button"
                tabIndex={0}
                aria-label={`${item.name} — ${
                    item.available ? "available" : "not available"
                }`}
                onClick={onSelect}
                onKeyDown={handleKeyDown}
                onFocus={onFocus}
                ref={ref}
            >
                <div
                    className={`card-poster${item.poster ? "" : " is-empty"}`}
                >
                    {item.poster ? (
                        <img
                            src={item.poster}
                            alt=""
                            loading="lazy"
                            decoding="async"
                        />
                    ) : (
                        <span>No poster available</span>
                    )}
                    {!item.available && (
                        <span className="card-badge">Not available</span>
                    )}
                    {!item.available && (
                        <button
                            type="button"
                            className={`heart-btn${wished ? " is-active" : ""}`}
                            aria-pressed={wished}
                            aria-label={
                                wished
                                    ? `Remove ${item.name} from wishlist`
                                    : `Add ${item.name} to wishlist`
                            }
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleWishlist(item.id);
                            }}
                        >
                            {wished ? "♥" : "♡"}
                        </button>
                    )}
                </div>
                <h3 className="card-title">{item.name}</h3>
                <p className="card-meta">{formatRuntime(item)}</p>
            </div>
        );
    },
);

Card.displayName = "Card";

export default Card;
