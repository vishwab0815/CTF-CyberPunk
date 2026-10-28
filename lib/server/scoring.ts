import { cols, type Ctx } from './db';
import { getAllChallenges } from './registry';
import { getSettings, type Settings } from './settings';

/** Current value of a challenge given how many eligible players have solved it. */
export function challengeValue(base: number, solves: number, s: Pick<Settings, 'scoringMode' | 'dynamicDecay' | 'dynamicMinRatio'>): number {
  if (s.scoringMode === 'static' || solves <= 1) return base;
  const min = Math.ceil(base * s.dynamicMinRatio);
  const frac = Math.min(1, (solves - 1) / s.dynamicDecay);
  return Math.round(base - (base - min) * frac);
}

export interface ScoreboardEntry {
  rank: number;
  playerId: string;
  handle: string;
  isGuest: boolean;
  score: number;
  solves: number;
  lastSolveAt: number | null;
  /** Cumulative score after each solve, for the progress chart. */
  timeline: { t: number; score: number }[];
}

export interface Scoreboard {
  frozen: boolean;
  generatedAt: number;
  entries: ScoreboardEntry[];
  challengeValues: Record<string, number>;
}

interface SolveRow {
  player_id: string;
  challenge_id: string;
  solved_at: number;
}
interface HintRow {
  player_id: string;
  challenge_id: string;
  cost: number;
  unlocked_at: number;
}

/**
 * Computes the scoreboard. Eligible players exclude admins and banned players. When `live`
 * is false and a freeze time has passed, activity after the freeze is ignored.
 */
export async function computeScoreboard(ctx: Ctx, opts: { live?: boolean; now?: number } = {}): Promise<Scoreboard> {
  const now = opts.now ?? Date.now();
  const settings = await getSettings(ctx);
  const frozen = !opts.live && settings.freezeAt !== null && now >= settings.freezeAt;
  const cutoff = frozen ? settings.freezeAt! : Number.MAX_SAFE_INTEGER;
  const challenges = await getAllChallenges(ctx);

  const playerFilter: Record<string, unknown> = { is_admin: 0, is_banned: 0 };
  if (!settings.scoreboardIncludeGuests) playerFilter.is_guest = 0;
  const players = (await cols(ctx).players.find(playerFilter, { projection: { id: 1, handle: 1, is_guest: 1, _id: 0 } }).toArray()) as unknown as { id: string; handle: string; is_guest: number }[];
  const eligible = new Map(players.map((p) => [p.id, p]));

  const solves = ((await cols(ctx).solves.find({ solved_at: { $lte: cutoff } }).sort({ solved_at: 1 }).toArray()) as unknown as SolveRow[]).filter(
    (s) => eligible.has(s.player_id) && challenges.has(s.challenge_id),
  );
  const hints = ((await cols(ctx).hint_unlocks.find({ unlocked_at: { $lte: cutoff } }).toArray()) as unknown as HintRow[]).filter((h) => eligible.has(h.player_id));

  const solveCounts = new Map<string, number>();
  for (const s of solves) solveCounts.set(s.challenge_id, (solveCounts.get(s.challenge_id) ?? 0) + 1);
  const values: Record<string, number> = {};
  for (const [id, def] of challenges) values[id] = challengeValue(def.points, solveCounts.get(id) ?? 0, settings);

  const byPlayer = new Map<string, { solves: SolveRow[]; hintCost: number }>();
  for (const s of solves) {
    const e = byPlayer.get(s.player_id) ?? { solves: [], hintCost: 0 };
    e.solves.push(s);
    byPlayer.set(s.player_id, e);
  }
  for (const h of hints) {
    const e = byPlayer.get(h.player_id);
    if (e) e.hintCost += h.cost;
  }

  const entries: Omit<ScoreboardEntry, 'rank'>[] = [];
  for (const [pid, data] of byPlayer) {
    const p = eligible.get(pid)!;
    let running = 0;
    const timeline = data.solves.map((s) => {
      running += values[s.challenge_id];
      return { t: s.solved_at, score: running };
    });
    entries.push({
      playerId: pid,
      handle: p.handle,
      isGuest: !!p.is_guest,
      score: Math.max(0, running - data.hintCost),
      solves: data.solves.length,
      lastSolveAt: data.solves[data.solves.length - 1]?.solved_at ?? null,
      timeline,
    });
  }
  entries.sort((a, b) => b.score - a.score || (a.lastSolveAt ?? 0) - (b.lastSolveAt ?? 0) || a.handle.localeCompare(b.handle));
  return {
    frozen,
    generatedAt: now,
    entries: entries.map((e, i) => ({ ...e, rank: i + 1 })),
    challengeValues: values,
  };
}
