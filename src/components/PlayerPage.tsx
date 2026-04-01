import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useLayoutEffect, useState, useRef } from "react";
import { loadContentDB, ContentItem } from "../../config";
import { useDirectionalNavigation } from "../../hooks/useDirectionalNavigation";
import Plyr from "plyr";

interface Track {
    index: number;
    track: number;
    language: string;
    title: string;
    codec: string;
}

interface Tracks {
    audio: Track[];
    subtitles: Track[];
}

const API_BASE = "http://192.168.5.67:3000";

export default function PlayerPage() {
    const { id } = useParams();
    const [item, setItem] = useState<ContentItem | null>(null);
    const [tracks, setTracks] = useState<Tracks | null>(null);
    const [selectedAudio, setSelectedAudio] = useState("0");
    const [selectedSub, setSelectedSub] = useState("-1");
    const [showTrackMenu, setShowTrackMenu] = useState(false);
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
        if (item) {
            fetch(`${API_BASE}/api/tracks/${id}`)
                .then((r) => r.json())
                .then((t) => setTracks(t))
                .catch(console.error);
        }
    }, [item, id]);

    useEffect(() => {
        if (item) requestAnimationFrame(focusFirst);
    }, [item]);

    useLayoutEffect(() => {
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
                    "captions",
                    "settings",
                    "fullscreen",
                ],
                keyboard: { focused: true, global: false },
                ratio: "16:9",
            });
        };

        video.addEventListener("canplay", handleCanPlay);

        return () => {
            if (playerRef.current) {
                playerRef.current.destroy();
                playerRef.current = null;
            }
            video.removeEventListener("canplay", handleCanPlay);
        };
    }, [item, selectedAudio, selectedSub]);

    if (!item) return <div>Loading...</div>;

    const streamUrl = `${API_BASE}/stream/${id}?audio=${selectedAudio}&subtitle=${selectedSub}`;
    const containerKey = `${id}-${selectedAudio}-${selectedSub}`;

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

            {tracks && (tracks.audio.length > 1 || tracks.subtitles.length > 0) && (
                <div className="track-selector">
                    <button onClick={() => setShowTrackMenu(!showTrackMenu)}>
                        ⚙️ Tracks
                    </button>
                    {showTrackMenu && (
                        <div className="track-menu">
                            <div className="track-group">
                                <h4>Audio</h4>
                                {tracks.audio.map((t, i) => (
                                    <label key={i}>
                                        <input
                                            type="radio"
                                            name="audio"
                                            value={t.track}
                                            checked={selectedAudio === String(t.track)}
                                            onChange={() => setSelectedAudio(String(t.track))}
                                        />
                                        {t.title} ({t.language})
                                    </label>
                                ))}
                            </div>
                            <div className="track-group">
                                <h4>Subtitles</h4>
                                <label>
                                    <input
                                        type="radio"
                                        name="subtitle"
                                        value="-1"
                                        checked={selectedSub === "-1"}
                                        onChange={() => setSelectedSub("-1")}
                                    />
                                    Off
                                </label>
                                {tracks.subtitles.map((t, i) => (
                                    <label key={i}>
                                        <input
                                            type="radio"
                                            name="subtitle"
                                            value={t.track}
                                            checked={selectedSub === String(t.track)}
                                            onChange={() => setSelectedSub(String(t.track))}
                                        />
                                        {t.title} ({t.language})
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {item.available ? (
                <div className="videoplayer-container" key={containerKey}>
                    <video
                        ref={videoRef}
                        className="videoplayer"
                        autoPlay
                    >
                        <source src={streamUrl} type="video/mp4" />
                    </video>
                </div>
            ) : (
                <p style={{ marginLeft: "2rem" }}>No media file available.</p>
            )}
        </>
    );
}
