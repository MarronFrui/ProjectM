import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { loadContentDB, ContentItem } from "../../config";
import CardsGrid from "./CardsGrid";

export default function CategoryPage() {
  const { genre } = useParams();
  const navigate = useNavigate();

  const [content, setContent] = useState<ContentItem[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);

  useEffect(() => {
    loadContentDB().then(setContent);
  }, []);

  if (!genre) {
    return <div>No category selected.</div>;
  }

  const decodedGenre = decodeURIComponent(genre);

  const filtered = content.filter(item =>
    item.category?.includes(decodedGenre)
  );

  const available = filtered.filter(i => i.available);
  const unavailable = filtered.filter(i => !i.available);

  const toggleWishlist = (id: string) => {
    setWishlist(prev =>
      prev.includes(id)
        ? prev.filter(x => x !== id)
        : [...prev, id]
    );
  };

  return (
    <>
      <header>
        <button onClick={() => navigate(-1)}>← Back</button>
        <h1>{decodedGenre}</h1>
      </header>

      {available.length > 0 && (
        <>
          <h2>Available</h2>
          <CardsGrid
            items={available}
            onSelect={() => {}}
            wishlist={wishlist}
            toggleWishlist={toggleWishlist}
          />
        </>
      )}

      {unavailable.length > 0 && (
        <>
          <h2>Unavailable</h2>
          <CardsGrid
            items={unavailable}
            onSelect={() => {}}
            wishlist={wishlist}
            toggleWishlist={toggleWishlist}
          />
        </>
      )}

      {filtered.length === 0 && (
        <p>No content found in this category.</p>
      )}
    </>
  );
}
