import { ContentItem } from "../../config";

interface Props {
    item: ContentItem;
    onSelect: () => void;
    wishlist: string[];
    toggleWishlist: (id: string) => void;
}

export default function Card({
  item,
  onSelect,
  wishlist,
  toggleWishlist,
}: Props) {
  let wishlistButton = null;
  if (!item.available) {
    wishlistButton = (
      <button
        onClick={(e) => {
          e.stopPropagation();
          toggleWishlist(item.id);
        }}
      >
        {wishlist.includes(item.id) ? "♥" : "♡"}
      </button>
    );
  }

  return (
    <div className="card" tabIndex={0} onClick={onSelect}>
      <img src={item.poster} alt={item.name} />
      <h3>{item.name}</h3>
      <p>
        {item.duration} min | Seasons: {item.seasons} | Episodes: {item.episodes}
      </p>

      {wishlistButton}
    </div>
  );
}