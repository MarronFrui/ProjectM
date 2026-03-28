import { useState, useEffect, createContext, ReactNode } from "react";
import { useAuth } from "./AuthProvider";
import { supabase } from '../supabase';

type WishlistContextType = {
    wishlist: string[];
    toggleWishlist: (id: string) => void;
};

const WishlistContext = createContext<WishlistContextType>({
    wishlist: [],
    toggleWishlist: () => {},
});

export function WishlistProvider({ children }: { children: ReactNode }) {
    const [wishlist, setWishlist] = useState<string[]>([]);
    const { user } = useAuth();

    useEffect(() => {
        if (!user) {
            setWishlist([]);
            return;
        }

        async function fetchWishlist() {
            const { data, error } = await supabase
                .from("wishlists")
                .select("item_id")
                .eq("user_id", user.id);

            if (error) {
                console.error(error);
            } else {
                setWishlist(data.map((row) => row.item_id));
            }
        }

        fetchWishlist();
    }, [user]);

    const toggleWishlist = async (id: string) => {
        if (!user) return;

        if (wishlist.includes(id)) {
            await supabase
                .from("wishlists")
                .delete()
                .eq("user_id", user.id)
                .eq("item_id", id);
            setWishlist((prev) => prev.filter((i) => i !== id));
        } else {
            await supabase
                .from("wishlists")
                .insert({ user_id: user.id, item_id: id });
            setWishlist((prev) => [...prev, id]);
        }
    };

    return (
        <WishlistContext.Provider value={{ wishlist, toggleWishlist }}>
            {children}
        </WishlistContext.Provider>
    );
}
