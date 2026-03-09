import { useNavigate } from "react-router-dom";
import { FocusableElement } from "../../hooks/useDirectionalNavigation";

interface Props {
    register: (id: string | undefined, el: FocusableElement | null, row: number, col: number) => void;
}

export default function CategoriesMenu({ register }: Props) {
    const navigate = useNavigate();

    return (
        <section className="categorie">
            <h2>Categories</h2>
            <div className="carousel-container">
                <div className="smaller-card-container">
                    <div className="smaller-card" tabIndex={0}
                        ref={(el) => register("menu-home", el, 5, 0)}
                        onClick={() => navigate("/")}
                    >
                        Home
                    </div>
                    <div className="smaller-card" tabIndex={0}
                        ref={(el) => register("menu-categories", el, 5, 1)}
                        onClick={() => navigate("/categories")}
                    >
                        Categories
                    </div>
                    <div className="smaller-card" tabIndex={0}
                        ref={(el) => register("menu-wishlist", el, 5, 2)}
                        onClick={() => navigate("/wishlist")}
                    >
                        Wishlist
                    </div>
                </div>
            </div>
        </section>
    );
}