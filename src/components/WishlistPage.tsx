import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { loadContentDB, ContentItem } from "../../config";
import CardsGrid from "./CardsGrid";

export default function WishlistPage() {
  const navigate = useNavigate();

  const [content, setContent] = useState<ContentItem[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);

  useEffect(() => {
    loadContentDB().then(setContent);
  }, []);

  const toggleWishlist = (id: string) => {
    setWishlist(prev =>
      prev.includes(id)
        ? prev.filter(x => x !== id)
        : [...prev, id]
    );
  };

  const wishlistItems = content.filter(
    item => wishlist.includes(item.id)
  );

  return (
    <>
      <header>
        <button onClick={() => navigate(-1)}>← Back</button>
        <h1>My Wishlist</h1>
      </header>

      {wishlistItems.length > 0 ? (
        <CardsGrid
          items={wishlistItems}
          onSelect={() => {}}
          wishlist={wishlist}
          toggleWishlist={toggleWishlist}
        />
      ) : (
        <p>Your wishlist is empty.</p>
      )}
    </>
  );
}
