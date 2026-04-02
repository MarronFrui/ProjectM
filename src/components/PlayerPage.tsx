import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useLayoutEffect, useState, useRef } from "react";
import { loadContentDB, ContentItem } from "../../config";
import { useDirectionalNavigation } from "../../hooks/useDirectionalNavigation";
import Plyr from "plyr";

interface AudioTrack {
    index: number;
    track: number;
    language: string;
    title: string;
    codec: string;
}

interface Tracks {
    audio: AudioTrack[];
}

interface ExternalSubtitle {
    lang: string;
    label: string;
    src: string;
}

const API_BASE = "http://192.168.5.67";

const LANG_LABELS: Record<string, string> = {
    en: "English",
    fr: "French",
};

export default function PlayerPage() {
    const { id } = useParams();
    const [item, setItem] = useState<ContentItem | null>(null);
    const [audioTracks, setAudioTracks] = useState<Tracks | null>(null);
    const [externalSubs, setExternalSubs] = useState<ExternalSubtitle[]>([]);
    const [selectedAudio, setSelectedAudio] = useState("0");
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
        if (item && id) {
            fetch(`${API_BASE}/api/tracks/${id}`)
                .then((r) => r.json())
                .then((t) => setAudioTracks(t))
                .catch(console.error);

            fetch(`${API_BASE}/api/subtitles-available/${id}`)
                .then((r) => r.json())
                .then((available) => {
                    const subs: ExternalSubtitle[] = [];
                    for (const sub of available) {
                        if (sub.lang === "en" || sub.lang === "fr") {
                            subs.push({
                                lang: sub.lang,
                                label:
                                    LANG_LABELS[sub.lang] ||
                                    sub.lang.toUpperCase(),
                                src: `${API_BASE}/api/subtitles/${id}?lang=${sub.lang}`,
                            });
                        }
                    }
                    setExternalSubs(subs);
                })
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
            const player = new Plyr(video, {
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

            player.source = {
                type: "video",
                sources: [{ src: video.src, type: "video/mp4" }],
                tracks: externalSubs.map((sub) => ({
                    kind: "captions",
                    label: sub.label,
                    srclang: sub.lang,
                    src: sub.src,
                })),
            };

            playerRef.current = player;

            console.log("[PLYR] Initialized with tracks");
            console.log("[PLYR] Text tracks:", video.textTracks.length);
            for (let i = 0; i < video.textTracks.length; i++) {
                const t = video.textTracks[i];
                console.log(
                    `  Track ${i}: kind=${t.kind}, label=${t.label}, lang=${t.language}, mode=${t.mode}`,
                );
            }
        };

        video.addEventListener("canplay", handleCanPlay);

        return () => {
            if (playerRef.current) {
                playerRef.current.destroy();
                playerRef.current = null;
            }
            video.removeEventListener("canplay", handleCanPlay);
        };
    }, [item]);

    if (!item) return <div>Loading...</div>;

    const streamUrl = `${API_BASE}/stream/${id}?audio=${selectedAudio}`;

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

            {(audioTracks?.audio.length ?? 0) > 1 && (
                <div className="track-selector">
                    <button onClick={() => setShowTrackMenu(!showTrackMenu)}>
                        ⚙️ Tracks
                    </button>
                    {showTrackMenu && (
                        <div className="track-menu">
                            <div className="track-group">
                                <h4>Audio</h4>
                                {audioTracks?.audio.map((t, i) => (
                                    <label key={i}>
                                        <input
                                            type="radio"
                                            name="audio"
                                            value={t.track}
                                            checked={
                                                selectedAudio ===
                                                String(t.track)
                                            }
                                            onChange={() =>
                                                setSelectedAudio(
                                                    String(t.track),
                                                )
                                            }
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
                <div className="videoplayer-container">
                    <video ref={videoRef} className="videoplayer" autoPlay>
                        <source src={streamUrl} type="video/mp4" />
                        {externalSubs.map((sub) => (
                            <track
                                key={sub.lang}
                                kind="subtitles"
                                src={sub.src}
                                srcLang={sub.lang}
                                label={sub.label}
                            />
                        ))}
                    </video>
                </div>
            ) : (
                <p style={{ marginLeft: "2rem" }}>No media file available.</p>
            )}
        </>
    );
}
