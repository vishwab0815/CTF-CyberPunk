import { cols, type Ctx } from './db';
import { randomToken, sha256Hex } from './crypto';
import { getPlayerById, toPlayer, type Player } from './players';

export const SESSION_COOKIE = 'range_session';

/**
 * Sessions are opaque random tokens. Only their SHA-256 is stored, so a leaked
 * database cannot be replayed as live sessions.
 */
export async function createSession(ctx: Ctx, playerId: string, meta: { ip?: string | null; userAgent?: string | null } = {}): Promise<{ token: string; expiresAt: number }> {
  const token = randomToken(32);
  const now = Date.now();
  const expiresAt = now + ctx.config.sessionTtlDays * 86_400_000;
  await cols(ctx).sessions.insertOne({
    _id: sha256Hex(token),
    player_id: playerId,
    created_at: now,
    expires_at: expiresAt,
    ip: meta.ip ?? null,
    user_agent: meta.userAgent?.slice(0, 256) ?? null,
  });
  return { token, expiresAt };
}

export async function resolveSession(ctx: Ctx, token: string | undefined | null): Promise<Player | null> {
  if (!token || token.length > 128) return null;
  const now = Date.now();
  const session = await cols(ctx).sessions.findOne({ _id: sha256Hex(token) });
  if (!session) return null;
  if (session.expires_at <= now) {
    await revokeSession(ctx, token);
    return null;
  }
  const row = await getPlayerById(ctx, session.player_id);
  if (!row) return null;
  if (now - row.last_seen_at > 60_000) {
    await cols(ctx).players.updateOne({ _id: row.id }, { $set: { last_seen_at: now } });
  }
  return toPlayer(row);
}

export async function revokeSession(ctx: Ctx, token: string): Promise<void> {
  await cols(ctx).sessions.deleteOne({ _id: sha256Hex(token) });
}

export async function revokeAllSessions(ctx: Ctx, playerId: string): Promise<void> {
  await cols(ctx).sessions.deleteMany({ player_id: playerId });
}

export async function purgeExpiredSessions(ctx: Ctx): Promise<number> {
  const res = await cols(ctx).sessions.deleteMany({ expires_at: { $lte: Date.now() } });
  return res.deletedCount ?? 0;
}
