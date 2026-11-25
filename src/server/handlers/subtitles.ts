import { RequestHandler } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { matches, scanMediaFolder } from '../methods/methods';
import type { ContentItem } from '../config';

const MEDIA_PATH = '/mnt/media'; //Is hardcoded for now | we could make it dynamic
const DB_PATH = path.resolve(__dirname, '../content-info/contentDB.json');

export const getSubtitlesAvailabilityById: RequestHandler = async (_req, res) => {
  try {
    const raw = await fs.readFile(DB_PATH, 'utf-8');
    const contentDB = JSON.parse(raw);
    const files = await fs.readdir(MEDIA_PATH);

    const items = await Promise.all(
      contentDB.map(async (item: ContentItem) => {
        const match = files.find((f) => matches(f, item.name));

        if (!match) {
          return {
            ...item,
            available: false,
            mediaFiles: null,
          };
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

    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed' });
  }
};

export const getSubtitlesById: RequestHandler = (req, res) => {
  res.send(` Hello ${req.url}`);
};
