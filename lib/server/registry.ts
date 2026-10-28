import { cols, type Ctx } from './db';
import { loadPacks, type PackLoadResult } from '../challenges/loader';
import type { CategoryId, ChallengeDef, Difficulty } from '../challenges/types';

interface PackCache {
  dir: string;
  at: number;
  result: PackLoadResult;
}

let packCache: PackCache | null = null;
const PACK_TTL_MS = 5_000;

export function clearPackCache(): void {
  packCache = null;
}

export function getPackResult(ctx: Ctx): PackLoadResult {
  const now = Date.now();
  if (!packCache || packCache.dir !== ctx.config.challengesDir || now - packCache.at > PACK_TTL_MS) {
    packCache = { dir: ctx.config.challengesDir, at: now, result: loadPacks(ctx.config.challengesDir) };
  }
  return packCache.result;
}

interface CustomRow {
  id: string;
  title: string;
  category: CategoryId;
  difficulty: Difficulty;
  points: number;
  summary: string;
  briefing: string;
  flag_digest: string;
  hints: string;
  requires: string;
  tags: string;
}

interface OverrideRow {
  challenge_id: string;
  enabled: number | null;
  points: number | null;
  max_attempts: number | null;
}

function parseJson<T>(s: string, fallback: T): T {
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

/** Every known challenge keyed by id, with admin overrides applied. Pack ids win over custom ids. */
export async function getAllChallenges(ctx: Ctx): Promise<Map<string, ChallengeDef>> {
  const map = new Map<string, ChallengeDef>();
  for (const c of getPackResult(ctx).challenges) map.set(c.id, { ...c });

  const customs = (await cols(ctx).custom_challenges.find().sort({ created_at: 1 }).toArray()) as unknown as CustomRow[];
  for (const r of customs) {
    if (map.has(r.id)) continue;
    map.set(r.id, {
      id: r.id,
      title: r.title,
      category: r.category,
      difficulty: r.difficulty,
      points: r.points,
      tags: parseJson<string[]>(r.tags, []),
      summary: r.summary,
      briefing: r.briefing,
      objectives: [],
      tools: [],
      hints: parseJson(r.hints, []),
      requires: parseJson<string[]>(r.requires, []),
      flag: { type: 'static', digest: r.flag_digest, keyed: true },
      artifacts: [],
      source: 'custom',
      enabled: true,
    });
  }

  const overrides = (await cols(ctx).challenge_overrides.find().toArray()) as unknown as OverrideRow[];
  for (const o of overrides) {
    const c = map.get(o.challenge_id);
    if (!c) continue;
    if (o.enabled !== null) c.enabled = !!o.enabled;
    if (o.points !== null) c.points = o.points;
    if (o.max_attempts !== null) c.maxAttempts = o.max_attempts;
  }
  return map;
}

export async function getChallenge(ctx: Ctx, id: string): Promise<ChallengeDef | null> {
  return (await getAllChallenges(ctx)).get(id) ?? null;
}
