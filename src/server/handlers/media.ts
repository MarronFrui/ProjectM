import { RequestHandler } from 'express';

export const getMediaById: RequestHandler = (req, res) => {
  res.send(` Hello ${req.url}`);
};

export const getMediaPath: RequestHandler = (req, res) => {
  res.send(` Hello ${req.url}`);
};

export const getAudioTracks: RequestHandler = (req, res) => {
  res.send(` Hello ${req.url}`);
};

export const getStream: RequestHandler = (req, res) => {
  res.send(` Hello ${req.url}`);
};
