import express from 'express';
import { getSubtitlesById, getSubtitlesAvailabilityById } from './handlers/subtitles';
import { getAudioTracks, getMediaById, getMediaPath, getStream } from './handlers/media';
import { corsMiddleware } from './middlewares/cors';

const app = express();

//-------------------------------middlewares--------------------
app.use(corsMiddleware);

//-------------------------------routes-------------------------
app.get('/api/content-availability', getMediaPath);

app.get('/media/:id', getMediaById);

app.get('/api/tracks/:id', getAudioTracks);

app.get('/stream/:id', getStream);

//-------------------------------subtitles-------------------------
app.get('/api/subtitles/:id', getSubtitlesById);

app.get('/api/subtitles-available/:id', getSubtitlesAvailabilityById);

//-------------------------------server-------------------------
app.listen(process.env.PORT || 3000);
