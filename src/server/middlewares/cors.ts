import cors from 'cors';

// Origins allowed to read API responses from a browser (override with ALLOWED_ORIGINS env var)
const ALLOWED_ORIGINS = [process.env.ALLOWED_ORIGINS?.split(',')];

// cors() is a middleware factory: it returns the actual request handler,
// so we export the result and app.use() it directly.
export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // No Origin header = same-origin nav, curl, server-to-server — allow
    if (!origin || ALLOWED_ORIGINS.includes(origin.split(','))) {
      return callback(null, true);
    }
    // Unknown origin: omit CORS headers so the browser blocks the response
    callback(null, false);
  },
});
