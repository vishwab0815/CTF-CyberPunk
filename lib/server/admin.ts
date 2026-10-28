import { z } from 'zod';
import { cols, type Ctx } from './db';
import { AppError, badRequest, notFound } from './errors';
import { logEvent } from './events';
import { keyedDigest } from './flags';
import { getAllChallenges, getPackResult } from './registry';
import { revokeAllSessions } from './sessions';
import { CATEGORY_IDS, DIFFICULTIES, challengeIdSchema } from '../challenges/types';

export const overrideSchema = z.object({
  enabled: z.boolean().optional(),
  points: z.number().int().min(10).max(5000).nullable().optional(),
  maxAttempts: z.number().int().min(1).max(10_000).nullable().optional(),
});

export async function setOverride(ctx: Ctx, adminId: string, id: string, patch: z.infer<typeof overrideSchema>): Promise<void> {
  if (!(await getAllChallenges(ctx)).has(id)) throw notFound('No such challenge.');
  const cur = await cols(ctx).challenge_overrides.findOne({ _id: id });
  const enabled = patch.enabled !== undefined ? (patch.enabled ? 1 : 0) : (cur?.enabled ?? null);
  const points = patch.points !== undefined ? patch.points : (cur?.points ?? null);
  const maxAttempts = patch.maxAttempts !== undefined ? patch.maxAttempts : (cur?.max_attempts ?? null);
  await cols(ctx).challenge_overrides.updateOne(
    { _id: id },
    { $set: { challenge_id: id, enabled, points, max_attempts: maxAttempts, updated_at: Date.now() } },
    { upsert: true },
  );
  await logEvent(ctx, 'admin.challenge_updated', { playerId: adminId, detail: { id, patch } });
}

export const customChallengeSchema = z.object({
  id: challengeIdSchema,
  title: z.string().min(3).max(80),
  category: z.enum(CATEGORY_IDS),
  difficulty: z.enum(DIFFICULTIES),
  points: z.number().int().min(10).max(5000),
  summary: z.string().min(1).max(200),
  briefing: z.string().min(1).max(8000),
  flag: z.string().trim().min(6).max(200),
  hints: z.array(z.object({ title: z.string().min(1).max(80), text: z.string().min(1).max(2000), cost: z.number().int().min(0).max(1000) })).max(6).default([]),
  requires: z.array(challengeIdSchema).max(8).default([]),
  tags: z.array(z.string().min(1).max(24)).max(8).default([]),
});

export async function createCustomChallenge(ctx: Ctx, adminId: string, input: z.input<typeof customChallengeSchema>): Promise<void> {
  const c = customChallengeSchema.parse(input);
  const all = await getAllChallenges(ctx);
  if (all.has(c.id)) throw new AppError(409, 'id_taken', 'A challenge with that id already exists.');
  for (const r of c.requires) if (!all.has(r)) throw badRequest(`Unknown prerequisite "${r}".`);
  const now = Date.now();
  await cols(ctx).custom_challenges.insertOne({
    _id: c.id,
    id: c.id,
    title: c.title,
    category: c.category,
    difficulty: c.difficulty,
    points: c.points,
    summary: c.summary,
    briefing: c.briefing,
    flag_digest: keyedDigest(ctx, c.id, c.flag),
    hints: JSON.stringify(c.hints),
    requires: JSON.stringify(c.requires),
    tags: JSON.stringify(c.tags),
    created_at: now,
    updated_at: now,
  });
  await logEvent(ctx, 'admin.challenge_created', { playerId: adminId, detail: { id: c.id } });
}

export async function deleteCustomChallenge(ctx: Ctx, adminId: string, id: string): Promise<void> {
  const res = await cols(ctx).custom_challenges.deleteOne({ _id: id });
  if (!res.deletedCount) throw notFound('No such custom challenge. Pack challenges are removed by deleting their folder.');
  await resetChallenge(ctx, adminId, id, false);
  await cols(ctx).challenge_overrides.deleteOne({ _id: id });
  await logEvent(ctx, 'admin.challenge_deleted', { playerId: adminId, detail: { id } });
}

/** Clears every player's progress on one challenge (solves, attempts, hints, issued flags). */
export async function resetChallenge(ctx: Ctx, adminId: string, id: string, log = true): Promise<void> {
  const c = cols(ctx);
  await Promise.all([
    c.solves.deleteMany({ challenge_id: id }),
    c.submissions.deleteMany({ challenge_id: id }),
    c.hint_unlocks.deleteMany({ challenge_id: id }),
    c.issued_flags.deleteMany({ challenge_id: id }),
  ]);
  if (log) await logEvent(ctx, 'challenge.reset', { severity: 'warn', playerId: adminId, detail: { id } });
}

/** Clears one player's progress without deleting the account. */
export async function resetPlayer(ctx: Ctx, adminId: string, playerId: string): Promise<void> {
  const exists = await cols(ctx).players.findOne({ _id: playerId }, { projection: { _id: 1 } });
  if (!exists) throw notFound('No such player.');
  const c = cols(ctx);
  await Promise.all([
    c.solves.deleteMany({ player_id: playerId }),
    c.submissions.deleteMany({ player_id: playerId }),
    c.hint_unlocks.deleteMany({ player_id: playerId }),
    c.issued_flags.deleteMany({ player_id: playerId }),
    c.players.updateOne({ _id: playerId }, { $set: { flagged: 0 } }),
  ]);
  await logEvent(ctx, 'player.reset', { severity: 'warn', playerId: adminId, detail: { target: playerId } });
}

export async function setBanned(ctx: Ctx, adminId: string, playerId: string, banned: boolean): Promise<void> {
  const row = await cols(ctx).players.findOne({ _id: playerId }, { projection: { is_admin: 1 } });
  if (!row) throw notFound('No such player.');
  if (row.is_admin) throw badRequest('Administrators cannot be banned.');
  await cols(ctx).players.updateOne({ _id: playerId }, { $set: { is_banned: banned ? 1 : 0 } });
  if (banned) await revokeAllSessions(ctx, playerId);
  await logEvent(ctx, banned ? 'player.banned' : 'player.unbanned', { severity: 'warn', playerId: adminId, detail: { target: playerId } });
}

export async function deletePlayer(ctx: Ctx, adminId: string, playerId: string): Promise<void> {
  if (playerId === adminId) throw badRequest('You cannot delete your own account.');
  const row = await cols(ctx).players.findOne({ _id: playerId }, { projection: { is_admin: 1 } });
  if (!row) throw notFound('No such player.');
  if (row.is_admin) throw badRequest('Administrators cannot be deleted here.');
  const c = cols(ctx);
  await Promise.all([
    c.players.deleteOne({ _id: playerId }),
    c.sessions.deleteMany({ player_id: playerId }),
    c.solves.deleteMany({ player_id: playerId }),
    c.submissions.deleteMany({ player_id: playerId }),
    c.hint_unlocks.deleteMany({ player_id: playerId }),
    c.issued_flags.deleteMany({ player_id: playerId }),
  ]);
  await logEvent(ctx, 'player.deleted', { severity: 'warn', playerId: adminId, detail: { target: playerId } });
}

export interface AdminPlayer {
  id: string;
  handle: string;
  isGuest: boolean;
  isAdmin: boolean;
  isBanned: boolean;
  flagged: boolean;
  solves: number;
  attempts: number;
  createdAt: number;
  lastSeenAt: number;
}

export async function listPlayers(ctx: Ctx): Promise<AdminPlayer[]> {
  const c = cols(ctx);
  const rows = await c.players.find({}, { projection: { _id: 0 } }).sort({ last_seen_at: -1 }).limit(1000).toArray();
  const [solveAgg, subAgg] = await Promise.all([
    c.solves.aggregate([{ $group: { _id: '$player_id', n: { $sum: 1 } } }]).toArray() as Promise<{ _id: string; n: number }[]>,
    c.submissions.aggregate([{ $group: { _id: '$player_id', n: { $sum: 1 } } }]).toArray() as Promise<{ _id: string; n: number }[]>,
  ]);
  const solveBy = new Map(solveAgg.map((r) => [r._id, r.n]));
  const subBy = new Map(subAgg.map((r) => [r._id, r.n]));
  return rows.map((r) => ({
    id: r.id,
    handle: r.handle,
    isGuest: !!r.is_guest,
    isAdmin: !!r.is_admin,
    isBanned: !!r.is_banned,
    flagged: !!r.flagged,
    solves: solveBy.get(r.id) ?? 0,
    attempts: subBy.get(r.id) ?? 0,
    createdAt: r.created_at,
    lastSeenAt: r.last_seen_at,
  }));
}

export async function listSubmissions(ctx: Ctx, limit = 200) {
  const n = Math.min(Math.max(limit, 1), 1000);
  const subs = await cols(ctx).submissions.find().sort({ created_at: -1, _id: -1 }).limit(n).toArray();
  const ids = [...new Set(subs.map((s) => s.player_id))];
  const players = await cols(ctx).players.find({ _id: { $in: ids } }, { projection: { id: 1, handle: 1, _id: 0 } }).toArray();
  const handleBy = new Map(players.map((p) => [p.id, p.handle]));
  return subs.map((s) => ({
    id: String(s._id),
    ts: s.created_at,
    challenge: s.challenge_id,
    correct: s.correct,
    submitted: s.submitted,
    ip: s.ip,
    handle: handleBy.get(s.player_id) ?? null,
  }));
}

export async function adminChallengeList(ctx: Ctx) {
  const all = await getAllChallenges(ctx);
  const counts = (await cols(ctx).solves.aggregate([{ $group: { _id: '$challenge_id', n: { $sum: 1 } } }]).toArray()) as { _id: string; n: number }[];
  const byId = new Map(counts.map((c) => [c._id, c.n]));
  return {
    challenges: [...all.values()].map((d) => ({
      id: d.id,
      title: d.title,
      category: d.category,
      difficulty: d.difficulty,
      points: d.points,
      enabled: d.enabled,
      source: d.source,
      flagType: d.flag.type,
      maxAttempts: d.maxAttempts ?? null,
      requires: d.requires,
      solves: byId.get(d.id) ?? 0,
    })),
    packErrors: getPackResult(ctx).errors,
  };
}
