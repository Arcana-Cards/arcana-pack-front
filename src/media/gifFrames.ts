import { parseGIF, decompressFrames } from 'gifuct-js';
import { API_ORIGIN, mediaUrl } from '@/api/client';

export type GifStrip = {
  width: number;
  height: number;
  frames: ImageData[];
};

export async function fetchGifBuffer(src: string): Promise<ArrayBuffer> {
  const direct = mediaUrl(src);
  try {
    const res = await fetch(direct);
    if (!res.ok) throw new Error('gif');
    const buf = await res.arrayBuffer();
    if (buf.byteLength < 16) throw new Error('empty');
    return buf;
  } catch {
    const token = localStorage.getItem('arcana_token');
    const target = /^https?:/i.test(src) ? src : direct;
    const proxied = await fetch(`${API_ORIGIN}/api/admin/uploads/fetch?url=${encodeURIComponent(target)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!proxied.ok) throw new Error('Impossible de lire le GIF');
    return proxied.arrayBuffer();
  }
}

export function decodeGifFrames(buffer: ArrayBuffer): GifStrip {
  const parsed = parseGIF(buffer);
  const patches = decompressFrames(parsed, true);
  const width = parsed.lsd.width;
  const height = parsed.lsd.height;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas indisponible');
  const patchCanvas = document.createElement('canvas');
  const patchCtx = patchCanvas.getContext('2d');
  if (!patchCtx) throw new Error('Canvas indisponible');
  const frames: ImageData[] = [];
  let backup: ImageData | null = null;
  ctx.clearRect(0, 0, width, height);
  for (const frame of patches) {
    if (frame.disposalType === 3) backup = ctx.getImageData(0, 0, width, height);
    patchCanvas.width = frame.dims.width;
    patchCanvas.height = frame.dims.height;
    patchCtx.putImageData(
      new ImageData(new Uint8ClampedArray(frame.patch), frame.dims.width, frame.dims.height),
      0,
      0,
    );
    ctx.drawImage(patchCanvas, frame.dims.left, frame.dims.top);
    frames.push(ctx.getImageData(0, 0, width, height));
    if (frame.disposalType === 2) {
      ctx.clearRect(frame.dims.left, frame.dims.top, frame.dims.width, frame.dims.height);
    } else if (frame.disposalType === 3 && backup) {
      ctx.putImageData(backup, 0, 0);
    }
  }
  if (!frames.length) throw new Error('GIF sans image');
  return { width, height, frames };
}

export function gifFrameToBlob(strip: GifStrip, index: number): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = strip.width;
  canvas.height = strip.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.reject(new Error('Canvas indisponible'));
  const frame = strip.frames[Math.max(0, Math.min(index, strip.frames.length - 1))];
  ctx.putImageData(frame, 0, 0);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Image fixe impossible'))), 'image/png');
  });
}

export async function loadGifStrip(src: string): Promise<GifStrip> {
  return decodeGifFrames(await fetchGifBuffer(src));
}
