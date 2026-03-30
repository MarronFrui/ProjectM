import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { loadContentDB, ContentItem } from "../../config";
import { useDirectionalNavigation } from "../../hooks/useDirectionalNavigation";
import Plyr from "plyr";


export default function PlayerPage() {
    const { id } = useParams();
    const [item, setItem] = useState<ContentItem | null>(null);
    const navigate = useNavigate();
    const { register, focusFirst } = useDirectionalNavigation();
    const videoRef = useRef<HTMLVideoElement>(null);
    const playerRef = useRef<Plyr | null>(null);

    useEffect(() => {
        loadContentDB().then((db) => {
            const found = db.find((x) => x.id === id);
            if (found) setItem(found);
        });
    }, [id]);

    useEffect(() => {
        if (item) requestAnimationFrame(focusFirst);
    }, [item]);

    useEffect(() => {
        if (!item || !videoRef.current) return;

        playerRef.current = new Plyr(videoRef.current, {
            controls: [
                "play-large",
                "play",
                "progress",
                "current-time",
                "mute",
                "volume",
                "fullscreen",
            ],
            keyboard: { focused: true, global: false },
        });

        return () => {
            playerRef.current?.destroy();
            playerRef.current = null;
        };
    }, [item]);

    if (!item) return <div>Loading...</div>;

    console.log(item);

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
                <div className="videoplayer-container">
                    <video ref={videoRef} className="videoplayer" autoPlay>
                        <source src={item.filePath} />
                    </video>
                </div>
            ) : (
                <p style={{ marginLeft: "2rem" }}>No media file available.</p>
            )}
        </>
    );
}
