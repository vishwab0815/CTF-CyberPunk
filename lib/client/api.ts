export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public data?: Record<string, unknown>,
  ) {
    super(message);
  }
}

export async function api<T = unknown>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(path, {
    method: init.method ?? 'GET',
    headers: init.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    credentials: 'same-origin',
    cache: 'no-store',
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  // The submit endpoint answers 422 with a normal result body for wrong flags.
  if (!res.ok && !(res.status === 422 && 'correct' in data)) {
    const err = (data.error ?? {}) as { code?: string; message?: string };
    throw new ApiError(res.status, err.code ?? 'error', err.message ?? `Request failed (${res.status})`, err as Record<string, unknown>);
  }
  return data as T;
}

export interface PlayerInfo {
  id: string;
  handle: string;
  isGuest: boolean;
  isAdmin: boolean;
  isBanned: boolean;
}

export interface CompetitionInfo {
  phase: 'open' | 'not_started' | 'ended';
  startsAt: number | null;
  endsAt: number | null;
  freezeAt: number | null;
  scoringMode: 'static' | 'dynamic';
  allowGuests: boolean;
  allowRegistration: boolean;
}

export interface CatalogEntry {
  id: string;
  title: string;
  category: string;
  difficulty: string;
  tags: string[];
  mission: string | null;
  summary: string;
  basePoints: number;
  value: number;
  solves: number;
  solved: boolean;
  locked: boolean;
  enabled: boolean;
  hintCount: number;
  requires: { id: string; title: string; solved: boolean }[];
}

export interface ChallengeDetail extends CatalogEntry {
  briefing: string;
  objectives: string[];
  tools: string[];
  artifacts: { file: string; description: string }[];
  hints: { index: number; title: string; cost: number; unlocked: boolean; text: string | null }[];
  attemptsUsed: number;
  maxAttempts: number;
  flagFormat: string;
}

export const CATEGORY_LABELS: Record<string, string> = {
  network: 'Network Recon',
  web: 'Web & API',
  osint: 'OSINT',
  linux: 'Linux Systems',
  forensics: 'DFIR',
  crypto: 'Crypto',
  reversing: 'Reversing',
  cloud: 'Cloud & DevSecOps',
  enterprise: 'Enterprise / AD',
  hunting: 'Threat Hunting',
};

export const DIFFICULTY_STYLE: Record<string, string> = {
  beginner: 'border-ok/40 text-ok',
  intermediate: 'border-info/40 text-info',
  advanced: 'border-signal/50 text-signal',
  expert: 'border-bad/50 text-bad',
};

export function fmtTime(ms: number): string {
  return new Date(ms).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}
