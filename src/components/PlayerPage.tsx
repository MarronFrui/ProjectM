import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useLayoutEffect, useState, useRef } from "react";
import { loadContentDB, ContentItem } from "../../config";
import { useDirectionalNavigation } from "../../hooks/useDirectionalNavigation";
import Plyr from "plyr";

interface AudioTrack {
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

interface EpisodeInfo {
    season: number;
    episode: number;
    filePath: string;
    label: string;
}

interface SeasonInfo {
    season: number;
    episodes: EpisodeInfo[];
}

const API_BASE = import.meta.env.VITE_API_URL || "http://192.168.5.67:3000";

const LANG_LABELS: Record<string, string> = {
    en: "English",
    fr: "French",
    jpn: "Japanese",
    de: "German",
    es: "Spanish",
    it: "Italian",
    pt: "Portuguese",
    ru: "Russian",
    zh: "Chinese",
    ko: "Korean",
    ar: "Arabic",
    nl: "Dutch",
    pl: "Polish",
    sv: "Swedish",
    da: "Danish",
    no: "Norwegian",
    fi: "Finnish",
    tr: "Turkish",
    cs: "Czech",
    hu: "Hungarian",
    ro: "Romanian",
    th: "Thai",
    vi: "Vietnamese",
    id: "Indonesian",
};

function parseEpisodeFromPath(filePath: string): EpisodeInfo | null {
    const fileName = filePath.split("/").pop() || "";

    let season = 1;
    let episode = 1;

    const sMatch = fileName.match(/[Ss](\d{1,2})[Ee](\d{1,2})/);
    if (sMatch) {
        season = parseInt(sMatch[1], 10);
        episode = parseInt(sMatch[2], 10);
    } else {
        const xMatch = fileName.match(/^(\d{1,2})[xX](\d{1,2})/);
        if (xMatch) {
            season = parseInt(xMatch[1], 10);
            episode = parseInt(xMatch[2], 10);
        }
    }

    return { season, episode, filePath, label: `Episode ${episode}` };
}

function organizeBySeasons(videos: string[]): SeasonInfo[] {
    const episodes = videos
        .map(parseEpisodeFromPath)
        .filter((e): e is EpisodeInfo => e !== null)
        .sort((a, b) => {
            if (a.season !== b.season) return a.season - b.season;
            return a.episode - b.episode;
        });

    const seasonsMap = new Map<number, SeasonInfo>();
    for (const ep of episodes) {
        if (!seasonsMap.has(ep.season)) {
            seasonsMap.set(ep.season, { season: ep.season, episodes: [] });
        }
        seasonsMap.get(ep.season)!.episodes.push(ep);
    }

    return Array.from(seasonsMap.values()).sort((a, b) => a.season - b.season);
}

export default function PlayerPage() {
    const { id, file } = useParams();
    const [item, setItem] = useState<ContentItem | null>(null);
    const [seasons, setSeasons] = useState<SeasonInfo[]>([]);
    const [selectedSeason, setSelectedSeason] = useState<number | null>(null);
    const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
    const [audioTracks, setAudioTracks] = useState<Tracks | null>(null);
    const [externalSubs, setExternalSubs] = useState<ExternalSubtitle[]>([]);
    const [selectedAudio, setSelectedAudio] = useState("0");
    const [showTrackMenu, setShowTrackMenu] = useState(false);
    const navigate = useNavigate();
    const { register, focusFirst } = useDirectionalNavigation();
    const videoRef = useRef<HTMLVideoElement>(null);
    const playerRef = useRef<Plyr | null>(null);

    const isTvShow = item?.seasons !== null;
    const hasMultipleVideos =
        seasons.length > 1 || seasons.some((s) => s.episodes.length > 1);

    useEffect(() => {
        loadContentDB().then((db) => {
            const found = db.find((x) => x.id === id);
            if (found) {
                setItem(found);
                const mf = (found as any).mediaFiles;

                if (mf?.videos?.length) {
                    const organized = organizeBySeasons(mf.videos);
                    setSeasons(organized);

                    if (file) {
                        setSelectedVideo(file);
                        const parsed = parseEpisodeFromPath(file);
                        if (parsed) setSelectedSeason(parsed.season);
                    } else if (organized.length > 0) {
                        const saved = localStorage.getItem(`player-${id}-lastFile`);
                        const match = saved && organized.some(s =>
                            s.episodes.some(e => e.filePath === saved)
                        );
                        if (match) {
                            setSelectedVideo(saved);
                            const parsed = parseEpisodeFromPath(saved);
                            if (parsed) setSelectedSeason(parsed.season);
                        } else {
                            setSelectedSeason(organized[0].season);
                            setSelectedVideo(organized[0].episodes[0].filePath);
                        }
                    }
                }
            }
        });
    }, [id, file]);

    useEffect(() => {
        if (selectedVideo) {
            localStorage.setItem(`player-${id}-lastFile`, selectedVideo);
        }
    }, [id, selectedVideo]);

    useEffect(() => {
        if (item && id && selectedVideo) {
            const fileParam = encodeURIComponent(selectedVideo);

            fetch(`${API_BASE}/api/tracks/${id}?file=${fileParam}`)
                .then((r) => r.json())
                .then((t) => setAudioTracks(t))
                .catch(console.error);

            fetch(`${API_BASE}/api/subtitles-available/${id}?file=${fileParam}`)
                .then((r) => r.json())
                .then((available) => {
                    const subs: ExternalSubtitle[] = [];
                    for (const sub of available) {
                        subs.push({
                            lang: sub.lang,
                            label:
                                LANG_LABELS[sub.lang] ||
                                sub.lang.toUpperCase(),
                            src: `${API_BASE}/api/subtitles/${id}?lang=${sub.lang}&file=${fileParam}`,
                        });
                    }
                    setExternalSubs(subs);
                })
                .catch(console.error);
        }
    }, [item, id, selectedVideo]);

    useEffect(() => {
        if (item) requestAnimationFrame(focusFirst);
    }, [item]);

    useLayoutEffect(() => {
        if (!item || !videoRef.current) return;

        const video = videoRef.current;

        const handleCanPlay = () => {
            if (!playerRef.current) {
                const player = new Plyr(video, {
                    captions: { active: false, update: true },
                    keyboard: { focused: true, global: false },
                    ratio: "16:9",
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
                });

                playerRef.current = player;
                console.log("[PLYR] Initialized");
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
    }, [item, selectedAudio, selectedVideo]);

    if (!item) return <div>Loading...</div>;

    const fileParam = selectedVideo ? encodeURIComponent(selectedVideo) : "";
    const containerKey = `${id}-${selectedVideo}`;
    const streamUrl = `${API_BASE}/stream/${id}?audio=${selectedAudio}${selectedVideo ? `&file=${fileParam}` : ""}`;

    const currentSeason = seasons.find((s) => s.season === selectedSeason);

    const handleSeasonSelect = (season: number) => {
        setSelectedSeason(season);
        const seasonData = seasons.find((s) => s.season === season);
        if (seasonData?.episodes[0]) {
            setSelectedVideo(seasonData.episodes[0].filePath);
        }
    };

    const handleEpisodeSelect = (episode: EpisodeInfo) => {
        setSelectedVideo(episode.filePath);
    };

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

            {item.available ? (
                <div className="videoplayer-container" key={containerKey}>
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

            {isTvShow &&
                hasMultipleVideos &&
                selectedSeason !== null &&
                currentSeason && (
                    <div className="season-selector">
                        <div className="season-buttons">
                            {seasons.map((s) => (
                                <button
                                    key={s.season}
                                    className={
                                        selectedSeason === s.season
                                            ? "active"
                                            : ""
                                    }
                                    onClick={() => handleSeasonSelect(s.season)}
                                >
                                    Season {s.season}
                                </button>
                            ))}
                        </div>
                        <div className="episode-list">
                            <h4>Season {selectedSeason}</h4>
                            {currentSeason.episodes.map((ep) => (
                                <button
                                    key={ep.filePath}
                                    className={
                                        selectedVideo === ep.filePath
                                            ? "active"
                                            : ""
                                    }
                                    onClick={() => handleEpisodeSelect(ep)}
                                >
                                    {ep.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

            {(audioTracks?.audio.length ?? 0) > 1 && (
                <div className="track-selector">
                    <button onClick={() => setShowTrackMenu(!showTrackMenu)}>
                        ⚙️ Audio
                    </button>
                    {showTrackMenu && (
                        <div className="track-menu">
                            <div className="track-group">
                                <h4>Audio</h4>
                                {audioTracks?.audio.map((t) => (
                                    <label key={t.track}>
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
        </>
    );
}
