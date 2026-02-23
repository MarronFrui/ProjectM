import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./HomePage";
import CategoryPage from "./CategoryPage";
import WishlistPage from "./WishlistPage";
import PlayerPage from "./PlayerPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/category/:genre" element={<CategoryPage />} />
        <Route path="/wishlist" element={<WishlistPage />} />
        <Route path="/player/:id" element={<PlayerPage />} />
      </Routes>
    </BrowserRouter>
  );
}
