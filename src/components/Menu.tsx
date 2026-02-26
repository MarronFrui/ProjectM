import { useNavigate } from "react-router-dom";

export default function CategoriesMenu() {
  const navigate = useNavigate();

  return (
    <section className="categorie">
      <h2>Categories</h2>
      <div className="carousel-container">
        <div className="smaller-card-container">

          <div
            className="smaller-card"
            tabIndex={0}
            onClick={() => navigate("/")}
          >
            Home
          </div>

          <div
            className="smaller-card"
            tabIndex={0}
            onClick={() => navigate("/categories")}
          >
            Categories
          </div>

          <div
            className="smaller-card"
            tabIndex={0}
            onClick={() => navigate("/wishlist")}
          >
            Wishlist
          </div>

        </div>
      </div>
    </section>
  );
}