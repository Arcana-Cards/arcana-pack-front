const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001/api';
export const API_ORIGIN = API_BASE.replace(/\/api\/?$/, '');

export function mediaUrl(value: string | null | undefined): string {
  if (!value) return '';
  if (/^(blob:|data:|https?:)/i.test(value)) return value;
  return `${API_ORIGIN}${value}`;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('anacra_token');
  const headers = new Headers(options.headers);
  const isForm = typeof FormData !== 'undefined' && options.body instanceof FormData;
  if (!isForm && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.success === false) {
    throw new ApiError(body.error || 'Requête impossible', res.status);
  }
  return body.data as T;
}

export type AiProgressEvent = {
  step: 'start' | 'brief' | 'giphy' | 'filter' | 'cards' | 'wait' | 'done';
  label: string;
  percent: number;
};

export async function streamAiFromTheme<T>(
  payload: unknown,
  onProgress: (event: AiProgressEvent) => void,
  onDrafts?: (drafts: T[]) => void,
): Promise<T[]> {
  const token = localStorage.getItem('anacra_token');
  const res = await fetch(`${API_BASE}/admin/ai/from-theme`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    let message = 'Génération impossible';
    try {
      const parsed = JSON.parse(text) as { error?: string };
      if (parsed.error) message = parsed.error;
    } catch {
      if (text) message = text.slice(0, 180);
    }
    throw new ApiError(message, res.status);
  }
  if (!res.body) throw new ApiError('Génération impossible', 502);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let drafts: T[] | null = null;
  let streamError: string | null = null;

  const consume = (block: string) => {
    const event = block.match(/^event:\s*(.+)$/m)?.[1]?.trim();
    const dataLine = block.match(/^data:\s*(.+)$/m)?.[1];
    if (!event || dataLine == null) return;
    const data = JSON.parse(dataLine) as { drafts?: T[]; error?: string } & AiProgressEvent;
    if (event === 'progress') onProgress(data);
    if (event === 'drafts' && Array.isArray(data.drafts)) {
      drafts = data.drafts;
      onDrafts?.(data.drafts);
    }
    if (event === 'done' && Array.isArray(data.drafts)) {
      drafts = data.drafts;
      onDrafts?.(data.drafts);
    }
    if (event === 'error') streamError = data.error || 'Génération impossible';
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop() || '';
    for (const part of parts) consume(part);
  }
  if (buffer.trim()) consume(buffer);

  if (streamError) throw new ApiError(streamError, 502);
  if (!drafts) throw new ApiError('Génération interrompue', 502);
  return drafts;
}
