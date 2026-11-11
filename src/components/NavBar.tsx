import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import { FocusableElement } from "../../hooks/useDirectionalNavigation";

interface Props {
    register: (
        id: string | undefined,
        el: FocusableElement | null,
        row: number,
        col: number,
    ) => void;
    /** Present when the current page offers title search. */
    search?: string;
    onSearchChange?: (value: string) => void;
}

const SearchIcon = () => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        aria-hidden="true"
    >
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4.35-4.35" />
    </svg>
);

/**
 * Persistent top navigation shared by every browse page.
 * Grid rows for the directional (TV remote) navigation: the brand and
 * links live in row 0, ahead of the card grid rows.
 */
export default function NavBar({ register, search, onSearchChange }: Props) {
    const navigate = useNavigate();
    const { user, signOut } = useAuth();
    const hasSearch = onSearchChange !== undefined;
    const authCol = hasSearch ? 4 : 3;

    const clearSearch = () => {
        onSearchChange?.("");
        document.getElementById("search")?.focus();
    };

    return (
        <nav className="top-nav" aria-label="Main navigation">
            <NavLink to="/" className="nav-brand">
                MaxFlix
            </NavLink>

            <div className="nav-links">
                <NavLink
                    to="/"
                    end
                    className="nav-link"
                    ref={(el) => register("nav-home", el, 0, 0)}
                >
                    Home
                </NavLink>
                <NavLink
                    to="/categories"
                    className="nav-link"
                    ref={(el) => register("nav-categories", el, 0, 1)}
                >
                    Categories
                </NavLink>
                <NavLink
                    to="/wishlist"
                    className="nav-link"
                    ref={(el) => register("nav-wishlist", el, 0, 2)}
                >
                    Wishlist
                </NavLink>
            </div>

            <div className="nav-actions">
                {hasSearch && (
                    <div className="search-box">
                        <SearchIcon />
                        <input
                            id="search"
                            type="search"
                            value={search}
                            onChange={(e) => onSearchChange?.(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Escape" && search) {
                                    e.stopPropagation();
                                    clearSearch();
                                }
                            }}
                            placeholder="Search titles…"
                            aria-label="Search titles"
                            ref={(el) => register("search", el, 0, 3)}
                        />
                        {search && (
                            <button
                                type="button"
                                className="search-clear"
                                onClick={clearSearch}
                                aria-label="Clear search"
                            >
                                ×
                            </button>
                        )}
                    </div>
                )}

                {user ? (
                    <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={signOut}
                        ref={(el) => register("nav-auth", el, 0, authCol)}
                    >
                        Logout
                    </button>
                ) : (
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => navigate("/login")}
                        ref={(el) => register("nav-auth", el, 0, authCol)}
                    >
                        Login
                    </button>
                )}
            </div>
        </nav>
    );
}
