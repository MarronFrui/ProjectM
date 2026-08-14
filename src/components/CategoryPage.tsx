import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useDirectionalNavigation } from "../../hooks/useDirectionalNavigation";
import { useContent } from "./ContentProvider";

export default function CategoryPage() {
    const [genres, setGenres] = useState<string[]>([]);
    const { content } = useContent();
    const navigate = useNavigate();
    const { register, focusFirst } = useDirectionalNavigation();
    const cardRefs = useRef<(HTMLElement | null)[]>([]);
    const recalcGrid = () => {
        const refs = cardRefs.current.filter(Boolean) as HTMLElement[];
        if (!refs.length) return;

        // group elements by their Y position
        const yGroups: Map<number, HTMLElement[]> = new Map();
        refs.forEach((el) => {
            const y = Math.round(el.getBoundingClientRect().top);
            if (!yGroups.has(y)) yGroups.set(y, []);
            yGroups.get(y)!.push(el);
        });

        // sort rows by Y, assign row numbers starting at 1
        const sortedRows = Array.from(yGroups.entries()).sort(
            (a, b) => a[0] - b[0],
        );
        sortedRows.forEach(([, els], rowIndex) => {
            // sort elements in each row by X position
            els.sort(
                (a, b) =>
                    a.getBoundingClientRect().left -
                    b.getBoundingClientRect().left,
            );
            els.forEach((el, colIndex) => {
                const genre = el.dataset.genre!;
                register(genre, el, rowIndex + 1, colIndex); // +1 keeps row 0 for back button
            });
        });
    };

    useEffect(() => {
        const allGenres = Array.from(
            new Set(content.flatMap((item) => item.category)),
        ).sort();

        setGenres(allGenres);
    }, [content]);

    useEffect(() => {
        if (genres.length > 0) {
            setTimeout(focusFirst, 0);
        }
    }, [genres]);

    useEffect(() => {
        if (genres.length > 0) recalcGrid();
    }, [genres]);

    useEffect(() => {
        window.addEventListener("resize", recalcGrid);
        return () => window.removeEventListener("resize", recalcGrid);
    }, [genres]);

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
                            data-genre={genre}
                            ref={(el) => {
                                cardRefs.current[index] = el;
                            }}
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
