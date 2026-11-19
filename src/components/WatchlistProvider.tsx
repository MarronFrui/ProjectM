import {
    useState,
    useEffect,
    useContext,
    createContext,
    ReactNode,
} from "react";

type WishlistContextType = {
    wishlist: string[];
    toggleWishlist: (id: string) => void;
};

const WishlistContext = createContext<WishlistContextType>({
    wishlist: [],
    toggleWishlist: () => {},
});

const STORAGE_KEY = "maxflix:wishlist";

function loadWishlist(): string[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

export function useWishlist() {
    return useContext(WishlistContext);
}

export function WishlistProvider({ children }: { children: ReactNode }) {
    const [wishlist, setWishlist] = useState<string[]>(loadWishlist);

    // Persist on every change so the wishlist survives reloads and
    // navigation; device-local until a real auth system replaces it.
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(wishlist));
        } catch {
            // Storage unavailable (private mode/quota) — keep in-memory state.
        }
    }, [wishlist]);

    const toggleWishlist = (id: string) => {
        setWishlist((prev) =>
            prev.includes(id)
                ? prev.filter((i) => i !== id)
                : [...prev, id],
        );
    };

    return (
        <WishlistContext.Provider value={{ wishlist, toggleWishlist }}>
            {children}
        </WishlistContext.Provider>
    );
}
