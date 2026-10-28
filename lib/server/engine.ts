import fs from 'node:fs';
import path from 'node:path';
import { cols, type Ctx } from './db';
import { AppError, badRequest, forbidden, notFound, tooMany } from './errors';
import { logEvent } from './events';
import { checkFlag, dynamicFlag, findFlagOwner, MAX_FLAG_LENGTH, recordIssuedFlag } from './flags';
import { hitRateLimit, LIMITS } from './ratelimit';
import { getAllChallenges } from './registry';
import { challengeValue } from './scoring';
import { competitionPhase, getSettings, type Settings } from './settings';
import type { Player } from './players';
import type { ChallengeDef } from '../challenges/types';

/** Default cap on wrong submissions per player per challenge. */
export const DEFAULT_MAX_ATTEMPTS = 100;
const MAX_ARTIFACT_BYTES = 25 * 1024 * 1024;

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

async function solvedSet(ctx: Ctx, playerId: string): Promise<Set<string>> {
  const rows = await cols(ctx).solves.find({ player_id: playerId }, { projection: { challenge_id: 1, _id: 0 } }).toArray();
  return new Set(rows.map((r) => r.challenge_id));
}

/** Solve counts over eligible players (not admins, not banned). */
async function solveCounts(ctx: Ctx): Promise<Map<string, number>> {
  const eligible = (await cols(ctx).players.find({ is_admin: 0, is_banned: 0 }, { projection: { id: 1, _id: 0 } }).toArray()).map((p) => p.id);
  const rows = (await cols(ctx)
    .solves.aggregate([{ $match: { player_id: { $in: eligible } } }, { $group: { _id: '$challenge_id', n: { $sum: 1 } } }])
    .toArray()) as { _id: string; n: number }[];
  return new Map(rows.map((r) => [r._id, r.n]));
}

function isUnlocked(def: ChallengeDef, solved: Set<string>, all: Map<string, ChallengeDef>): boolean {
  return def.requires.every((r) => solved.has(r) || !all.get(r)?.enabled);
}

function visibleTo(def: ChallengeDef, player: Player): boolean {
  return def.enabled || player.isAdmin;
}

function toEntry(def: ChallengeDef, solved: Set<string>, counts: Map<string, number>, all: Map<string, ChallengeDef>, settings: Settings): CatalogEntry {
  const n = counts.get(def.id) ?? 0;
  return {
    id: def.id,
    title: def.title,
    category: def.category,
    difficulty: def.difficulty,
    tags: def.tags,
    mission: def.mission ?? null,
    summary: def.summary,
    basePoints: def.points,
    value: challengeValue(def.points, n, settings),
    solves: n,
    solved: solved.has(def.id),
    locked: !isUnlocked(def, solved, all),
    enabled: def.enabled,
    hintCount: def.hints.length,
    requires: def.requires.filter((r) => all.has(r)).map((r) => ({ id: r, title: all.get(r)!.title, solved: solved.has(r) })),
  };
}

export async function listCatalog(ctx: Ctx, player: Player): Promise<CatalogEntry[]> {
  const [all, solved, counts, settings] = await Promise.all([getAllChallenges(ctx), solvedSet(ctx, player.id), solveCounts(ctx), getSettings(ctx)]);
  return [...all.values()].filter((d) => visibleTo(d, player)).map((d) => toEntry(d, solved, counts, all, settings));
}

async function requireChallenge(ctx: Ctx, player: Player, id: string): Promise<{ def: ChallengeDef; all: Map<string, ChallengeDef>; solved: Set<string> }> {
  const all = await getAllChallenges(ctx);
  const def = all.get(id);
  if (!def || !visibleTo(def, player)) throw notFound('No such challenge.');
  const solved = await solvedSet(ctx, player.id);
  return { def, all, solved };
}

/** Like requireChallenge but also enforces prerequisites. Admins bypass them. */
async function requireUnlocked(ctx: Ctx, player: Player, id: string) {
  const r = await requireChallenge(ctx, player, id);
  if (!player.isAdmin && !isUnlocked(r.def, r.solved, r.all)) {
    throw forbidden('Solve the prerequisite challenges to unlock this one.');
  }
  return r;
}

async function unlockedHints(ctx: Ctx, playerId: string, challengeId: string): Promise<Set<number>> {
  const rows = await cols(ctx).hint_unlocks.find({ player_id: playerId, challenge_id: challengeId }, { projection: { hint_index: 1, _id: 0 } }).toArray();
  return new Set(rows.map((r) => r.hint_index));
}

async function attemptsUsed(ctx: Ctx, playerId: string, challengeId: string): Promise<number> {
  return cols(ctx).submissions.countDocuments({ player_id: playerId, challenge_id: challengeId, correct: 0 });
}

export async function getChallengeDetail(ctx: Ctx, player: Player, id: string): Promise<ChallengeDetail> {
  const { def, all, solved } = await requireUnlocked(ctx, player, id);
  await recordIssuedFlag(ctx, def, player.id);
  const [open, counts, settings, used] = await Promise.all([
    unlockedHints(ctx, player.id, id),
    solveCounts(ctx),
    getSettings(ctx),
    attemptsUsed(ctx, player.id, id),
  ]);
  return {
    ...toEntry(def, solved, counts, all, settings),
    briefing: def.briefing,
    objectives: def.objectives,
    tools: def.tools,
    artifacts: def.artifacts.map((a) => ({ file: a.file, description: a.description })),
    hints: def.hints.map((h, index) => ({
      index,
      title: h.title,
      cost: h.cost,
      unlocked: open.has(index),
      text: open.has(index) ? h.text : null,
    })),
    attemptsUsed: used,
    maxAttempts: def.maxAttempts ?? DEFAULT_MAX_ATTEMPTS,
    flagFormat: `${ctx.config.flagPrefix}{...}`,
  };
}

export interface SubmitResult {
  correct: boolean;
  alreadySolved: boolean;
  message: string;
  value?: number;
  attemptsLeft?: number;
}

async function assertCompetitionOpen(ctx: Ctx, player: Player): Promise<void> {
  if (player.isAdmin) return;
  const phase = competitionPhase(await getSettings(ctx));
  if (phase === 'not_started') throw new AppError(403, 'not_started', 'The competition has not started yet.');
  if (phase === 'ended') throw new AppError(403, 'ended', 'The competition has ended. Submissions are closed.');
}

export async function submitFlag(ctx: Ctx, player: Player, id: string, submitted: unknown, ip: string | null): Promise<SubmitResult> {
  if (typeof submitted !== 'string' || !submitted.trim()) throw badRequest('Enter a flag.');
  if (submitted.length > MAX_FLAG_LENGTH) throw badRequest('That is too long to be a flag.');
  if (player.isBanned) throw forbidden('This account has been suspended.');
  await assertCompetitionOpen(ctx, player);

  const { def, solved } = await requireUnlocked(ctx, player, id);
  if (solved.has(id)) return { correct: true, alreadySolved: true, message: 'Already solved.' };

  for (const [key, lim] of [
    [`submit:pc:${player.id}:${id}`, LIMITS.submitPerPlayerChallenge],
    [`submit:p:${player.id}`, LIMITS.submitPerPlayer],
    ...(ip ? ([[`submit:ip:${ip}`, LIMITS.submitPerIp]] as const) : []),
  ] as const) {
    const r = await hitRateLimit(ctx, key, lim.limit, lim.windowMs);
    if (!r.allowed) {
      await logEvent(ctx, 'abuse.rate_limited', { severity: 'warn', playerId: player.id, ip, detail: { scope: key.split(':')[1], challenge: id } });
      throw tooMany(r.retryAfterMs);
    }
  }

  const cap = def.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const used = await attemptsUsed(ctx, player.id, id);
  if (used >= cap) {
    await logEvent(ctx, 'abuse.attempt_cap', { severity: 'warn', playerId: player.id, ip, detail: { challenge: id } });
    throw new AppError(429, 'attempt_cap', 'You have used all attempts for this challenge. Ask an organiser to reset it.');
  }

  const correct = checkFlag(ctx, def, player.id, submitted);
  const now = Date.now();

  if (correct) {
    await cols(ctx).submissions.insertOne({ player_id: player.id, challenge_id: id, correct: 1, submitted: '[correct]', ip, created_at: now });
    await cols(ctx).solves.updateOne(
      { _id: `${player.id}:${id}` },
      { $setOnInsert: { player_id: player.id, challenge_id: id, solved_at: now } },
      { upsert: true },
    );
    await logEvent(ctx, 'challenge.solved', { playerId: player.id, ip, detail: { challenge: id } });
    const [counts, settings] = await Promise.all([solveCounts(ctx), getSettings(ctx)]);
    const value = challengeValue(def.points, counts.get(id) ?? 1, settings);
    return { correct: true, alreadySolved: false, message: 'Flag accepted.', value };
  }

  await cols(ctx).submissions.insertOne({ player_id: player.id, challenge_id: id, correct: 0, submitted: submitted.trim().slice(0, 128), ip, created_at: now });
  const owner = await findFlagOwner(ctx, def, submitted);
  if (owner && owner !== player.id) {
    await cols(ctx).players.updateMany({ _id: { $in: [player.id, owner] } }, { $set: { flagged: 1 } });
    await logEvent(ctx, 'abuse.flag_sharing', { severity: 'alert', playerId: player.id, ip, detail: { challenge: id, flagOwner: owner } });
  }
  return { correct: false, alreadySolved: false, message: 'Incorrect flag.', attemptsLeft: cap - used - 1 };
}

export async function unlockHint(ctx: Ctx, player: Player, id: string, index: number) {
  await assertCompetitionOpen(ctx, player);
  const { def } = await requireUnlocked(ctx, player, id);
  const hint = Number.isInteger(index) ? def.hints[index] : undefined;
  if (!hint) throw notFound('No such hint.');
  const res = await cols(ctx).hint_unlocks.updateOne(
    { _id: `${player.id}:${id}:${index}` },
    { $setOnInsert: { player_id: player.id, challenge_id: id, hint_index: index, cost: hint.cost, unlocked_at: Date.now() } },
    { upsert: true },
  );
  if ((res.upsertedCount ?? 0) > 0) await logEvent(ctx, 'challenge.hint_unlocked', { playerId: player.id, detail: { challenge: id, index, cost: hint.cost } });
  return { index, title: hint.title, cost: hint.cost, text: hint.text };
}

const CONTENT_TYPES: Record<string, string> = {
  '.txt': 'text/plain; charset=utf-8',
  '.log': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.json': 'application/json',
};

export interface ArtifactFile {
  filename: string;
  contentType: string;
  body: Buffer;
}

/** Looks the file up in the pack's declared artifact list, so request input never forms a path. */
export async function readArtifact(ctx: Ctx, player: Player, id: string, file: string): Promise<ArtifactFile> {
  const { def } = await requireUnlocked(ctx, player, id);
  const art = def.artifacts.find((a) => a.file === file);
  if (!art || !def.dir) throw notFound('No such file.');
  const root = path.resolve(def.dir, 'files');
  const full = path.resolve(root, art.file);
  if (path.dirname(full) !== root) throw notFound('No such file.');
  const stat = fs.statSync(full);
  if (!stat.isFile() || stat.size > MAX_ARTIFACT_BYTES) throw notFound('No such file.');
  let body = fs.readFileSync(full);
  if (art.template) {
    await recordIssuedFlag(ctx, def, player.id);
    const flag = def.flag.type === 'dynamic' ? dynamicFlag(ctx, def.id, player.id, def.flag.tag) : '';
    body = Buffer.from(body.toString('utf8').replaceAll('{{FLAG}}', flag).replaceAll('{{HANDLE}}', player.handle), 'utf8');
  }
  return { filename: art.file, contentType: CONTENT_TYPES[path.extname(art.file).toLowerCase()] ?? 'application/octet-stream', body };
}

export interface MyProgress {
  score: number;
  rank: number | null;
  solved: { id: string; title: string; category: string; solvedAt: number; value: number }[];
  hintsSpent: number;
  byCategory: { category: string; solved: number; total: number }[];
}

export async function getProgress(ctx: Ctx, player: Player, ranks: Map<string, { rank: number; score: number }>, values: Record<string, number>): Promise<MyProgress> {
  const all = await getAllChallenges(ctx);
  const rows = await cols(ctx).solves.find({ player_id: player.id }, { projection: { challenge_id: 1, solved_at: 1, _id: 0 } }).sort({ solved_at: 1 }).toArray();
  const solved = rows
    .filter((r) => all.has(r.challenge_id))
    .map((r) => ({ id: r.challenge_id, title: all.get(r.challenge_id)!.title, category: all.get(r.challenge_id)!.category, solvedAt: r.solved_at, value: values[r.challenge_id] ?? 0 }));
  const agg = (await cols(ctx).hint_unlocks.aggregate([{ $match: { player_id: player.id } }, { $group: { _id: null, n: { $sum: '$cost' } } }]).toArray()) as { n: number }[];
  const spent = agg[0]?.n ?? 0;
  const solvedIds = new Set(solved.map((s) => s.id));
  const cats = new Map<string, { solved: number; total: number }>();
  for (const d of all.values()) {
    if (!d.enabled) continue;
    const c = cats.get(d.category) ?? { solved: 0, total: 0 };
    c.total++;
    if (solvedIds.has(d.id)) c.solved++;
    cats.set(d.category, c);
  }
  const mine = ranks.get(player.id);
  return {
    score: mine?.score ?? Math.max(0, solved.reduce((a, s) => a + s.value, 0) - spent),
    rank: mine?.rank ?? null,
    solved,
    hintsSpent: spent,
    byCategory: [...cats.entries()].map(([category, v]) => ({ category, ...v })),
  };
}
