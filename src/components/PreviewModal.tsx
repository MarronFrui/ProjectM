import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ContentItem } from "../../config";

export default function PreviewModal({
    item,
    onClose,
    wishlist,
    toggleWishlist,
    registerModal,
    focusFirstModal,
}: {
    item: ContentItem;
    onClose: () => void;
    wishlist: string[];
    toggleWishlist: (id: string) => void;
    registerModal: (el: HTMLElement | null) => void;
    focusFirstModal: () => void;
}) {

 const navigate = useNavigate();

    useEffect(() => {
        focusFirstModal();
    }, []);

  return (
    <div id="preview-modal" className="active">
      <div id="preview-content">

        <button
          ref={registerModal}
          id="close-preview"
          onClick={onClose}
        >
          ✖
        </button>


        <img
          id="preview-image"
          src={item.poster ?? "./content-info/poster/default.jpg"}
          alt={item.name}
        />


        <h3 id="preview-name">{item.name}</h3>


        <p id="preview-description">{item.description}</p>


        {item.seasons === null ? (
          <p id="preview-duration">Duration: {item.duration} min</p>
        ) : (
          <p id="preview-seasons-episodes">
            Seasons: {item.seasons} | Episodes: {item.episodes}
          </p>
        )}


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