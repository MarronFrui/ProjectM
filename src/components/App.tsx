import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./HomePage";
import CategoryPage from "./CategoryPage";
import WishlistPage from "./WishlistPage";
import PlayerPage from "./PlayerPage";
import LoginPage from "./LoginPage";
import { AuthProvider } from "./AuthProvider";
import { ContentProvider } from "./ContentProvider";

export default function App() {
    return (
        <AuthProvider>
            <ContentProvider>
                <BrowserRouter>
                    <Routes>
                        <Route path="/" element={<HomePage />} />
                        <Route path="/categories" element={<CategoryPage />} />
                        <Route path="/category/:genre" element={<HomePage />} />
                        <Route path="/wishlist" element={<WishlistPage />} />
                        <Route path="/player/:id" element={<PlayerPage />} />
                        <Route path="/player/:id/:file" element={<PlayerPage />} />
                        <Route path="/login" element={<LoginPage />} />
                    </Routes>
                </BrowserRouter>
            </ContentProvider>
        </AuthProvider>
    );
}
