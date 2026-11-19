import {
    BrowserRouter,
    Routes,
    Route,
    Navigate,
} from "react-router-dom";
import HomePage from "./HomePage";
import CategoryPage from "./CategoryPage";
import WishlistPage from "./WishlistPage";
import PlayerPage from "./PlayerPage";
import { ContentProvider } from "./ContentProvider";
import { WishlistProvider } from "./WatchlistProvider";

export default function App() {
    return (
        <WishlistProvider>
            <ContentProvider>
                <BrowserRouter>
                    <Routes>
                        <Route path="/" element={<HomePage />} />
                        <Route path="/categories" element={<CategoryPage />} />
                        <Route path="/category/:genre" element={<HomePage />} />
                        <Route path="/wishlist" element={<WishlistPage />} />
                        <Route path="/player/:id" element={<PlayerPage />} />
                        <Route
                            path="/player/:id/:file"
                            element={<PlayerPage />}
                        />
                        {/* Login flow removed with Supabase; auth will be
                            rebuilt separately. Old links land on Home. */}
                        <Route
                            path="/login"
                            element={<Navigate to="/" replace />}
                        />
                    </Routes>
                </BrowserRouter>
            </ContentProvider>
        </WishlistProvider>
    );
}
