import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';
import type { ContentItem } from '../config';

const STOPWORDS = ['the', 'of', 'and'];

const DB_PATH = path.resolve(__dirname, '../content-info/contentDB.json');
const MEDIA_PATH = '/mnt/media';

const envPath = path.resolve(__dirname, '../.env');
let OPENSUBTITLES_API_KEY = '';
let TMDB_API_KEY = '';

export interface FfprobeOutput {
  streams?: FfprobeStream[];
}

export interface FfprobeStream {
  index: number;
  codec_type: string;
  codec_name: string;
  tags?: { language?: string; title?: string };
}

try {
  const envContent = await fs.readFile(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      if (key.trim() === 'OPENSUBTITLES_API_KEY') {
        OPENSUBTITLES_API_KEY = valueParts.join('=').trim();
      } else if (key.trim() === 'TMDB_API_KEY') {
        TMDB_API_KEY = valueParts.join('=').trim();
      }
    }
  }
} catch (err) {
  console.warn('Could not read .env file:', err instanceof Error ? err.message : err);
}

console.log('Resolved DB path:', DB_PATH);
console.log('OpenSubtitles API Key loaded:', OPENSUBTITLES_API_KEY ? 'Yes' : 'No');
console.log('TMDB API Key loaded:', TMDB_API_KEY ? 'Yes' : 'No');

const episodeNameCache = new Map();
const EPISODE_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

async function getEpisodeName(tmdbId: string, season: number, episode: number) {
  const cacheKey = `${tmdbId}-${season}-${episode}`;

  const cached = episodeNameCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < EPISODE_CACHE_TTL_MS) {
    console.log(`[SUBTITLE] Episode name cache hit: ${cacheKey} = ${cached.name}`);
    return cached.name;
  }

  if (!TMDB_API_KEY) {
    throw new Error('TMDB API key not found');
  }

  const url = `https://api.themoviedb.org/3/tv/${tmdbId}/season/${season}/episode/${episode}?api_key=${TMDB_API_KEY}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`TMDB API error: ${response.status}`);
  }

  const data = await response.json();
  const episodeName = data.name;

  if (!episodeName) {
    throw new Error(`No episode name found for S${season}E${episode}`);
  }

  episodeNameCache.set(cacheKey, {
    name: episodeName,
    timestamp: Date.now(),
  });
  console.log(`[SUBTITLE] Cached episode name: ${cacheKey} = ${episodeName}`);

  return episodeName;
}

export function normalize(str: string) {
  return str
    .toLowerCase()
    .replace(/\(.*?\)/g, '') // remove (year etc)
    .replace(/[^a-z0-9]/g, ' ')
    .trim();
}

export function matches(file: string, itemName: string) {
  const fWords: string[] = normalize(file).split(/\s+/); //recheck type please
  const iWords: string[] = normalize(itemName)
    .split(/\s+/)
    .filter((w) => !STOPWORDS.includes(w));

  const overlap = iWords.filter((word) => fWords.includes(word));

  return overlap.length >= Math.ceil(iWords.length * 0.6);
}

export function normalizeMediaPath(requestedFile: string) {
  return requestedFile.replace(/^\/media\//, '');
}

// Resolve userPath inside base, rejecting anything that escapes base (path traversal)
export function safeJoin(base: string, userPath: string) {
  if (!userPath) return null;
  const resolved = path.resolve(base, userPath);
  if (resolved !== base && !resolved.startsWith(base + path.sep)) return null;
  return resolved;
}

export async function scanMediaFolder(folderPath: string, isTvShow: boolean) {
  const result: { videos: string[]; subtitles: string[]; folderPath: string } = {
    videos: [],
    subtitles: [],
    folderPath: path.basename(folderPath),
  };

  try {
    if (!isTvShow) {
      const files = await fs.readdir(folderPath);
      for (const file of files) {
        const fullPath = path.join(folderPath, file);
        const stat = await fs.stat(fullPath);
        if (stat.isFile()) {
          if (/\.(mp4|mkv|avi|mov|webm)$/i.test(file)) {
            result.videos.push(`/media/${path.basename(folderPath)}/${file}`);
          } else if (/\.vtt$/i.test(file)) {
            result.subtitles.push(`/media/${path.basename(folderPath)}/${file}`);
          }
        }
      }
    } else {
      const entries = await fs.readdir(folderPath);
      for (const entry of entries) {
        const entryPath = path.join(folderPath, entry);
        const stat = await fs.stat(entryPath);

        if (stat.isDirectory()) {
          const seasonFiles = await fs.readdir(entryPath);
          for (const file of seasonFiles) {
            const filePath = path.join(entryPath, file);
            const fileStat = await fs.stat(filePath);
            if (fileStat.isFile()) {
              if (/\.(mp4|mkv|avi|mov|webm)$/i.test(file)) {
                result.videos.push(`/media/${path.basename(folderPath)}/${entry}/${file}`);
              } else if (/\.vtt$/i.test(file)) {
                result.subtitles.push(`/media/${path.basename(folderPath)}/${entry}/${file}`);
              }
            }
          }
        }
      }
    }
  } catch (err) {
    console.error(`Error scanning folder ${folderPath}:`, err instanceof Error ? err.message : err);
  }

  return result;
}

export async function loadContentWithPaths() {
  const raw = await fs.readFile(DB_PATH, 'utf-8');
  const contentDB = JSON.parse(raw);
  const files = await fs.readdir(MEDIA_PATH);

  const updatedDb = await Promise.all(
    contentDB.map(async (item: ContentItem) => {
      const match = files.find((f) => matches(f, item.name));

      if (!match) {
        return { ...item, available: false, mediaFiles: null };
      }

      const isTvShow = item.seasons !== null;
      const folderPath = path.join(MEDIA_PATH, match);
      const mediaFiles = await scanMediaFolder(folderPath, isTvShow);

      return {
        ...item,
        available: mediaFiles.videos.length > 0,
        mediaFiles,
      };
    }),
  );

  return updatedDb;
}

export async function getVideoPath(itemId: string, requestedFile = null) {
  const copyDB = await loadContentWithPaths();
  const item = copyDB.find((i) => i.id === itemId);
  if (!item) return null;
  if (requestedFile === null) return;

  if (requestedFile) {
    return safeJoin(MEDIA_PATH, normalizeMediaPath(requestedFile));
  }

  if (!item.mediaFiles || item.mediaFiles.videos.length === 0) return null;

  const videoPath = item.mediaFiles.videos[0];
  return safeJoin(MEDIA_PATH, normalizeMediaPath(videoPath));
}

export async function getTrackInfo(itemId: string, requestedFile = null) {
  const videoPath = await getVideoPath(itemId, requestedFile);
  if (!videoPath) return null;

  return new Promise((resolve) => {
    const ffprobe = spawn('ffprobe', [
      '-v',
      'quiet',
      '-print_format',
      'json',
      '-show_streams',
      videoPath,
    ]);

    ffprobe.on('error', (err) => {
      console.error('[TRACKS] ffprobe failed:', err instanceof Error ? err.message : err);
      resolve(null);
    });

    let data = '';
    ffprobe.stdout.on('data', (chunk) => (data += chunk));
    ffprobe.on('close', (code) => {
      if (code !== 0) return resolve(null);
      try {
        const info: FfprobeOutput = JSON.parse(data);
        const streams = info.streams || [];

        const audio = streams
          .filter((s) => s.codec_type === 'audio')
          .map((s) => ({
            index: streams.indexOf(s),
            track: streams.indexOf(s),
            language: s.tags?.language || 'unknown',
            title: s.tags?.title || `Audio ${streams.indexOf(s) + 1}`,
            codec: s.codec_name,
          }));

        resolve({ audio });
      } catch {
        resolve(null);
      }
    });
  });
}

export function getSeasonAndEpisode(filePath: string) {
  if (!filePath) return null;
  const fileName = filePath.split('/').pop() || '';
  const match = fileName.match(/[Ss](\d{1,2})[Ee](\d{1,3})/);
  if (match) {
    return {
      season: parseInt(match[1], 10),
      episode: parseInt(match[2], 10),
    };
  }
  return null;
}

export function getEpisodeIdFromPath(filePath: string) {
  const se = getSeasonAndEpisode(filePath);
  if (se) {
    return `S${String(se.season).padStart(2, '0')}E${String(se.episode).padStart(2, '0')}`;
  }
  return null;
}

// Canonical numeric form so S1E2 / S01E02 / S01E002 all compare equal
export function normalizeEpisodeId(id: string) {
  if (!id) return null;
  const match = id.match(/S(\d+)E(\d+)/i);
  if (!match) return null;
  return `S${parseInt(match[1], 10)}E${parseInt(match[2], 10)}`;
}

export function getSubsDirPath(requestedFile: string) {
  if (!requestedFile) return null;
  let relativePath = requestedFile;
  if (relativePath.startsWith('/media/')) {
    relativePath = relativePath.replace('/media/', '/');
  }
  const withoutFile = path.dirname(relativePath).replace(/^\/+/, '');
  const base = safeJoin(MEDIA_PATH, withoutFile);
  return base ? path.join(base, 'subs') : null;
}

export function getUpperSubsDir(requestedFile: string) {
  if (!requestedFile) return null;
  let relativePath = requestedFile;
  if (relativePath.startsWith('/media/')) {
    relativePath = relativePath.replace('/media/', '/');
  }
  const withoutFile = path.dirname(relativePath).replace(/^\/+/, '');
  const base = safeJoin(MEDIA_PATH, withoutFile);
  return base ? path.join(base, 'Subs') : null;
}
