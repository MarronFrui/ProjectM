import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { loadContentDB, ContentItem } from "../../config";
import CardsGrid from "./CardsGrid";
import { useDirectionalNavigation } from "../../hooks/useDirectionalNavigation";

export default function WishlistPage() {
    const navigate = useNavigate();
    const { register, focusFirst } = useDirectionalNavigation();

    const [content, setContent] = useState<ContentItem[]>([]);
    const [wishlist, setWishlist] = useState<string[]>([]);

    const toggleWishlist = (id: string) => {
        setWishlist((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
        );
    };

    const wishlistItems = content.filter((item) => wishlist.includes(item.id));

    useEffect(() => {
        loadContentDB().then(setContent);
    }, []);
    
    // wishlistItems.length will trigger focusFirst once wishlist persistence is implemented
    useEffect(() => {
        if (wishlistItems.length > 0) requestAnimationFrame(focusFirst);
    }, [wishlistItems.length]);

    return (
        <>
            <header>
                <h1>My Wishlist</h1>
            </header>

            <button id="back-button" onClick={() => navigate(-1)}>
                ← Back
            </button>
            {wishlistItems.length > 0 ? (
                <CardsGrid
                    items={wishlistItems}
                    onSelect={() => {}}
                    wishlist={wishlist}
                    toggleWishlist={toggleWishlist}
                    register={register}
                    baseRow={1}
                />
            ) : (
                <p>Your wishlist is empty.</p>
            )}
        </>
    );
}
