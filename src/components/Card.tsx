import { ContentItem } from "../../config";
import { forwardRef } from "react";

interface Props {
    item: ContentItem;
    onSelect: () => void;
    wishlist: string[];
    toggleWishlist: (id: string) => void;
}

const Card = forwardRef<HTMLDivElement, Props>(
    ({ item, onSelect, wishlist, toggleWishlist }, ref) => {
        return (
            <div className="card" tabIndex={0} onClick={onSelect} ref={ref}>
                <img src={item.poster} alt={item.name} />
                <h3>{item.name}</h3>
                <p>
                    {item.seasons === null
                        ? `${item.duration} min`
                        : `Seasons: ${item.seasons} | Episodes: ${item.episodes}`}
                </p>
                {!item.available && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleWishlist(item.id);
                        }}
                    >
                        {wishlist.includes(item.id) ? "♥" : "♡"}
                    </button>
                )}
            </div>
        );
    },
);

Card.displayName = "Card";

export default Card;
