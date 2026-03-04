import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { loadContentDB, ContentItem } from "../../config";
import { useDirectionalNavigation } from "../../hooks/useDirectionalNavigation";

export default function CategoryPage() {
    const [genres, setGenres] = useState<string[]>([]);
    const navigate = useNavigate();
    const { register } = useDirectionalNavigation();

    useEffect(() => {
        async function fetchGenres() {
            const items: ContentItem[] = await loadContentDB();

            const allGenres = Array.from(
                new Set(items.flatMap((item) => item.category)),
            ).sort();

            setGenres(allGenres);
        }

        fetchGenres();
    }, []);

    const openGenre = (genre: string) => {
        navigate(`/category/${encodeURIComponent(genre)}`);
    };

    return (
        <>
            <header>
                <h1>Select a Genre</h1>
            </header>

            <button
                id="back-button"
                tabIndex={0}
                ref={(el) => register(undefined, el, 0, 0)}
                onClick={() => navigate(-1)}
            >
                ← Back
            </button>

            <div className="carousel-container">
                <div className="smaller-card-container-categories">
                    {genres.map((genre, index) => (
                        <div
                            key={genre}
                            className="smaller-card"
                            tabIndex={0}
                            ref={(el) => register(undefined, el, 1, index)}
                            onClick={() => openGenre(genre)}
                        >
                            {genre}
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}
