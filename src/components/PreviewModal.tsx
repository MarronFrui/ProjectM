import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ContentItem } from "../../config";
import { useDirectionalNavigation } from "../../hooks/useDirectionalNavigation";

export default function PreviewModal({
  item,
  onClose,
  wishlist,
  toggleWishlist,
}: {
  item: ContentItem;
  onClose: () => void;
  wishlist: string[];
  toggleWishlist: (id: string) => void;
}) {
  const navigate = useNavigate();
  const { registerModal, setModalOpen } = useDirectionalNavigation();


  useEffect(() => {
    setModalOpen(true); 
    return () => setModalOpen(false); // cleanup on unmount
  }, []);

  return (
    <div id="preview-modal" className="active">
      <div id="preview-content">
        {/* Close button */}
        <button
          ref={registerModal}
          id="close-preview"
          onClick={onClose}
        >
          ✖
        </button>

        {/* Poster */}
        <img
          id="preview-image"
          src={item.poster ?? "./content-info/poster/default.jpg"}
          alt={item.name}
        />

        {/* Title */}
        <h3 id="preview-name">{item.name}</h3>

        {/* Description */}
        <p id="preview-description">{item.description}</p>

        {/* Duration / Seasons */}
        {item.seasons === null ? (
          <p id="preview-duration">Duration: {item.duration} min</p>
        ) : (
          <p id="preview-seasons-episodes">
            Seasons: {item.seasons} | Episodes: {item.episodes}
          </p>
        )}

        {/* Action buttons */}
        {item.available ? (
          <button
            ref={registerModal}
            id="play-button"
            onClick={() => navigate(`/player/${item.id}`)}
          >
            Play
          </button>
        ) : (
          <button
            ref={registerModal}
            id="add-to-wishlist"
            onClick={() => toggleWishlist(item.id)}
          >
            {wishlist.includes(item.id)
              ? "Remove from wishlist"
              : "Add to wishlist"}
          </button>
        )}
      </div>
    </div>
  );
}