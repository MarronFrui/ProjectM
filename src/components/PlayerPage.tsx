import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useLayoutEffect, useState, useRef } from "react";
import { loadContentDB, ContentItem } from "../../config";
import { useDirectionalNavigation } from "../../hooks/useDirectionalNavigation";
import Plyr from "plyr";
import ASS from "assjs";

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
    trackLang: string;
    label: string;
    src: string;
    format: "vtt" | "ass";
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

const API_BASE = import.meta.env.VITE_URL;

const LANG_LABELS: Record<string, string> = {
    en: "English",
    fr: "French",
    ja: "Japanese",
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
    el: "Greek",
    lt: "Lithuanian",
    bg: "Bulgarian",
    sr: "Serbian",
    sk: "Slovak",
    sl: "Slovenian",
    et: "Estonian",
    lv: "Latvian",
    uk: "Ukrainian",
    he: "Hebrew",
    hi: "Hindi",
    ms: "Malay",
    is: "Icelandic",
    fa: "Persian",
    hr: "Croatian",
    ca: "Catalan",
    gl: "Galician",
    eu: "Basque",
    hy: "Armenian",
    ka: "Georgian",
    kk: "Kazakh",
    yi: "Yiddish",
    sq: "Albanian",
    my: "Burmese",
    cy: "Welsh",
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
    const [subtitleTracks, setSubtitleTracks] = useState<ExternalSubtitle[]>([]);
    const [selectedAudio, setSelectedAudio] = useState("0");
    const [showTrackMenu, setShowTrackMenu] = useState(false);
    const navigate = useNavigate();
    const { register, focusFirst } = useDirectionalNavigation();
    const videoRef = useRef<HTMLVideoElement>(null);
    const playerRef = useRef<Plyr | null>(null);
    const assContainerRef = useRef<HTMLDivElement>(null);
    const assInstancesRef = useRef<Map<string, ASS>>(new Map());
    const subtitleTracksRef = useRef<ExternalSubtitle[]>([]);

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
                        setSelectedSeason(organized[0].season);
                        setSelectedVideo(organized[0].episodes[0].filePath);
                    }
                }
            }
        });
    }, [id, file]);

    useEffect(() => {
        if (!item || !id || !selectedVideo) return;
        const fileParam = encodeURIComponent(selectedVideo);
        let active = true;

        assInstancesRef.current.forEach(a => a.destroy());
        assInstancesRef.current.clear();

        fetch(`${API_BASE}/api/tracks/${id}?file=${fileParam}`)
            .then((r) => r.json())
            .then((t) => setAudioTracks(t))
            .catch(console.error);

        fetch(`${API_BASE}/api/subtitles-available/${id}?file=${fileParam}`)
            .then((r) => r.json())
            .then((available) => {
                if (!active) return;

                const byLang: Record<string, typeof available> = {};
                for (const sub of available) {
                    if (!byLang[sub.lang]) byLang[sub.lang] = [];
                    byLang[sub.lang].push(sub);
                }

                const tracks: ExternalSubtitle[] = [];
                for (const [lang, entries] of Object.entries(byLang)) {
                    const assEntry = entries.find((e: any) => (e.format || "vtt") === "ass");
                    if (assEntry) {
                        tracks.push({
                            lang,
                            trackLang: lang,
                            label: LANG_LABELS[lang] || lang.toUpperCase(),
                            src: `${API_BASE}/api/subtitles/${id}?lang=${lang}&file=${fileParam}&track=true`,
                            format: "ass",
                        });
                    } else {
                        const vttEntries = entries.filter((e: any) => (e.format || "vtt") === "vtt");
                        vttEntries.forEach((_entry: any, i: number) => {
                            const label = i === 0
                                ? (LANG_LABELS[lang] || lang.toUpperCase())
                                : `${LANG_LABELS[lang] || lang.toUpperCase()} (${i + 1})`;
                            tracks.push({
                                lang,
                                trackLang: i === 0 ? lang : `${lang}-${i + 1}`,
                                label,
                                src: `${API_BASE}/api/subtitles/${id}?lang=${lang}&file=${fileParam}`,
                                format: "vtt",
                            });
                        });
                    }
                }

                setSubtitleTracks(tracks);
                subtitleTracksRef.current = tracks;

                const video = videoRef.current;
                const container = assContainerRef.current;
                if (!video || !container) return;

                for (const track of tracks) {
                    if (track.format !== 'ass') continue;
                    const realSrc = track.src.replace('&track=true', '');
                    fetch(realSrc)
                        .then(r => r.text())
                        .then(content => {
                            if (!active || !assContainerRef.current) return;
                            const ass = new ASS(content, video, { container });
                            ass.hide();
                            assInstancesRef.current.set(track.lang, ass);
                            if (!video.paused) {
                                video.dispatchEvent(new Event('playing'));
                            }
                        })
                        .catch(console.error);
                }
            })
            .catch(console.error);

        return () => {
            active = false;
            assInstancesRef.current.forEach(a => a.destroy());
            assInstancesRef.current.clear();
        };
    }, [item, id, selectedVideo]);

    useEffect(() => {
        if (item) requestAnimationFrame(focusFirst);
    }, [item]);

    useLayoutEffect(() => {
        if (!item || !videoRef.current) return;

        const video = videoRef.current;
        let onCaptionsDisabled: (() => void) | undefined;

        const handleCanPlay = () => {
            if (!playerRef.current) {
                const player = new Plyr(video, {
                    captions: { active: false, update: true },
                    keyboard: { focused: true, global: false },
                    ratio: "16:9",
                    fullscreen: { container: '.videoplayer-wrapper' },
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

                player.on('languagechange', () => {
                    assInstancesRef.current.forEach(a => a.hide());

                    const node = (player as any).captions?.currentTrackNode;
                    const trackLang = node?.language;
                    if (!trackLang) return;

                    const match = subtitleTracksRef.current.find(s => s.trackLang === trackLang);
                    if (match && match.format === 'ass') {
                        const instance = assInstancesRef.current.get(match.lang);
                        if (instance) {
                            instance.show();
                            if (!video.paused) {
                                video.dispatchEvent(new Event('playing'));
                            }
                        }
                    }
                });

                onCaptionsDisabled = () => {
                    assInstancesRef.current.forEach(a => a.hide());
                };
                video.addEventListener('captionsdisabled', onCaptionsDisabled);

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
            if (onCaptionsDisabled) video.removeEventListener('captionsdisabled', onCaptionsDisabled);
        };
    }, [item, selectedAudio, selectedVideo]);

    const containerKey = `${id}-${selectedVideo}`;

    if (!item) return <div>Loading...</div>;

    const fileParam = selectedVideo ? encodeURIComponent(selectedVideo) : "";
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
                    <div className="videoplayer-wrapper">
                        <video ref={videoRef} className="videoplayer" autoPlay>
                            <source src={streamUrl} type="video/mp4" />
                            {subtitleTracks.map((sub) => (
                                <track
                                    key={`${sub.lang}-${sub.label}`}
                                    kind="subtitles"
                                    src={sub.src}
                                    srcLang={sub.trackLang}
                                    label={sub.label}
                                />
                            ))}
                        </video>
                        <div ref={assContainerRef} className="ass-overlay" />
                    </div>
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
