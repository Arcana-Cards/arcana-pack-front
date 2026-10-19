import { mediaUrl } from '@/api/client';

export function giphyIdFromUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase();
  if (host !== 'giphy.com' && !host.endsWith('.giphy.com')) return null;
  const media = url.pathname.match(/\/media\/([A-Za-z0-9]+)/i);
  if (media) return media[1];
  const file = url.pathname.match(/\/([A-Za-z0-9]{4,32})\.(?:gif|webp|mp4)$/i);
  if (file) return file[1];
  const last = (url.pathname.split('/').filter(Boolean).at(-1) || '').replace(/\.(gif|webp|mp4)$/i, '');
  if (/^[A-Za-z0-9]{4,32}$/.test(last)) return last;
  const token = last.split('-').at(-1) || '';
  return /^[A-Za-z0-9]{4,32}$/.test(token) ? token : null;
}

export function giphyGifUrl(id: string): string {
  return `https://i.giphy.com/${id}.gif`;
}

export function giphyStillUrl(id: string): string {
  return `https://media.giphy.com/media/${id}/giphy_s.gif`;
}

export function isAnimatedArtUrl(raw: string | null | undefined): boolean {
  if (!raw?.trim()) return false;
  const value = raw.trim();
  if (/giphy_s|_s\.gif/i.test(value)) return false;
  if (giphyIdFromUrl(value)) return true;
  return /\.gif(\?|#|$)/i.test(value);
}

export function resolveArtSrc(raw: string | null | undefined, animated = false): string {
  if (!raw) return '';
  const id = giphyIdFromUrl(raw);
  if (id) return animated ? giphyGifUrl(id) : giphyStillUrl(id);
  return mediaUrl(raw);
}
