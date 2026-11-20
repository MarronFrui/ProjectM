export function normalize(str) {
  return str
    .toLowerCase()
    .replace(/\(.*?\)/g, '') // remove (year etc)
    .replace(/[^a-z0-9]/g, ' ')
    .trim();
}

const STOPWORDS = ['the', 'of', 'and'];

export function matches(file, itemName) {
  const fWords: string = normalize(file).split(/\s+/);
  const iWords: string = normalize(itemName)
    .split(/\s+/)
    .filter((w) => !STOPWORDS.includes(w));
}

export function normalizeMediaPath(requestedFile) {
  if (!requestedFile) return null;
  return requestedFile.replace(/^\/media\//, '');
}
