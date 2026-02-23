import { useNavigate } from "react-router-dom";
import { ContentItem } from "../../config";

export default function PreviewModal({
  item,
  onClose,
  wishlist,
  toggleWishlist
}: {
  item: ContentItem;
  onClose: () => void;
  wishlist: string[];
  toggleWishlist: (id: string) => void;
}) {
  const navigate = useNavigate();

  return (
    <div className="preview active">
      <button onClick={onClose}>✖</button>

      <img src={item.poster} alt={item.name} />
      <h3>{item.name}</h3>
      <p>{item.description}</p>

      {item.available ? (
        <button onClick={() => navigate(`/player/${item.id}`)}>
          Play
        </button>
      ) : (
        <button onClick={() => toggleWishlist(item.id)}>
          {wishlist.includes(item.id)
            ? "Remove from wishlist"
            : "Add to wishlist"}
        </button>
      )}
    </div>
  );
}
