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

        const video = videoRef.current;

        const handleCanPlay = () => {
            playerRef.current = new Plyr(video, {
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
                ratio: "16:9",
            });
        };

        video.addEventListener("canplay", handleCanPlay);

        return () => {
            video.removeEventListener("canplay", handleCanPlay);
            playerRef.current?.destroy();
            playerRef.current = null;
        };
    }, [item]);

    // ONLY FOR DEBUGGING
    useEffect(() => {
        if (!videoRef.current) return;

        const video = videoRef.current;

        video.addEventListener("loadstart", () => console.log("loadstart"));
        video.addEventListener("loadedmetadata", () =>
            console.log("metadata loaded"),
        );
        video.addEventListener("canplay", () => console.log("canplay"));
        video.addEventListener("play", () => console.log("playing"));
        video.addEventListener("error", (e) => {
            console.error("VIDEO ERROR:", video.error);
        });
    }, [item]);

    if (!item) return <div>Loading...</div>;

    console.log(item);
    console.log("VIDEO URL:", `http://192.168.5.67:3000${item.filePath}`);

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
                        <source
                            src={`http://192.168.5.67:3000/media/${item.id}`}
                            type="video/mp4"
                        />
                    </video>
                </div>
            ) : (
                <p style={{ marginLeft: "2rem" }}>No media file available.</p>
            )}
        </>
    );
}
