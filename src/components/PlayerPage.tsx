import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { loadContentDB, ContentItem } from "../../config";
import { useDirectionalNavigation } from "../../hooks/useDirectionalNavigation";

export default function PlayerPage() {
    const { id } = useParams();
    const [item, setItem] = useState<ContentItem | null>(null);
    const navigate = useNavigate();
    const { register, focusFirst } = useDirectionalNavigation();

    useEffect(() => {
        loadContentDB().then((db) => {
            const found = db.find((x) => x.id === id);
            if (found) setItem(found);
        });
    }, [id]);
    
    useEffect(() => {
      if (item) requestAnimationFrame(focusFirst)
    }, [item]);

    if (!item) return <div>Loading...</div>;

    return (
        <>
            <button
                id="back-button"
                tabIndex={0}
                ref={(el) => register(undefined, el, 0, 0)}
                onClick={() => navigate(-1)}
            >
                ← Back
            </button>
            <h2>{item.name}</h2>
            {item.filePath ? (
                <video controls autoPlay src={item.filePath} />
            ) : (
                <p style={{ marginLeft: "2rem" }}>No media file available.</p>
            )}
        </>
    );
}
