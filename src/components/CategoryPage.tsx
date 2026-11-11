import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "./NavBar";
import { useDirectionalNavigation } from "../../hooks/useDirectionalNavigation";
import { useContent } from "./ContentProvider";

export default function CategoryPage() {
    const [genres, setGenres] = useState<string[]>([]);
    const { content, loading, error } = useContent();
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
                register(genre, el, rowIndex + 1, colIndex); // +1 keeps row 0 for the nav
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
            const id = requestAnimationFrame(focusFirst);
            return () => cancelAnimationFrame(id);
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
            <NavBar register={register} />

            <main className="page">
                <section className="section" aria-label="Genres">
                    <h1 className="section-title">
                        Browse by genre
                        <span className="section-count">
                            {genres.length}{" "}
                            {genres.length === 1 ? "genre" : "genres"}
                        </span>
                    </h1>

                    {loading && (
                        <div className="empty-state" aria-live="polite">
                            <p>Loading genres…</p>
                        </div>
                    )}

                    {error && (
                        <div className="error-state" role="alert">
                            <h2 className="error-state-title">
                                Couldn&apos;t load your library
                            </h2>
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={() => window.location.reload()}
                            >
                                Retry
                            </button>
                        </div>
                    )}

                    {!loading && !error && genres.length === 0 && (
                        <div className="empty-state">
                            <div className="empty-state-icon" aria-hidden="true">
                                🎬
                            </div>
                            <h2 className="empty-state-title">No genres yet</h2>
                            <p className="empty-state-text">
                                Add titles to your library to see genres here.
                            </p>
                        </div>
                    )}

                    <div className="genre-grid">
                        {genres.map((genre, index) => (
                            <button
                                key={genre}
                                type="button"
                                className="genre-pill"
                                data-genre={genre}
                                ref={(el) => {
                                    cardRefs.current[index] = el;
                                }}
                                onClick={() => openGenre(genre)}
                            >
                                {genre}
                            </button>
                        ))}
                    </div>
                </section>
            </main>
        </>
    );
}
