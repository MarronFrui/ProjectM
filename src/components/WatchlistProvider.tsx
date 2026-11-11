import {
    useState,
    useEffect,
    useContext,
    createContext,
    ReactNode,
} from "react";
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

export function useWishlist() {
    return useContext(WishlistContext);
}

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

    // Optimistic toggle: update the UI immediately, then reconcile with the
    // backend so the heart reacts instantly even on a slow connection.
    const toggleWishlist = async (id: string) => {
        if (!user) return;

        const wasWished = wishlist.includes(id);
        setWishlist((prev) =>
            wasWished ? prev.filter((i) => i !== id) : [...prev, id],
        );

        try {
            if (wasWished) {
                await supabase
                    .from("wishlists")
                    .delete()
                    .eq("user_id", user.id)
                    .eq("item_id", id);
            } else {
                await supabase
                    .from("wishlists")
                    .insert({ user_id: user.id, item_id: id });
            }
        } catch (err) {
            console.error("Wishlist update failed", err);
            // Revert so the UI never disagrees with the stored state.
            setWishlist((prev) =>
                wasWished ? [...prev, id] : prev.filter((i) => i !== id),
            );
        }
    };

    return (
        <WishlistContext.Provider value={{ wishlist, toggleWishlist }}>
            {children}
        </WishlistContext.Provider>
    );
}
