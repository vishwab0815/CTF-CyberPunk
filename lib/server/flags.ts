import { cols, type Ctx } from './db';
import { hmacHex, safeEqual, sha256Hex } from './crypto';
import type { ChallengeDef } from '../challenges/types';

export const MAX_FLAG_LENGTH = 256;

/** The unique flag a player must find for a dynamic challenge. */
export function dynamicFlag(ctx: Ctx, challengeId: string, playerId: string, tag: string): string {
  const mac = hmacHex(ctx.secret, `flag:${challengeId}:${playerId}`).slice(0, 20);
  return `${ctx.config.flagPrefix}{${tag}_${mac}}`;
}

/** Digest stored for admin-created static flags. Keyed so a leaked database cannot be brute-forced offline. */
export function keyedDigest(ctx: Ctx, challengeId: string, flag: string): string {
  return hmacHex(ctx.secret, `static:${challengeId}:${flag.trim()}`);
}

/** Constant-time check of a submission. */
export function checkFlag(ctx: Ctx, def: ChallengeDef, playerId: string, submitted: string): boolean {
  const candidate = submitted.trim();
  if (def.flag.type === 'dynamic') {
    return safeEqual(candidate, dynamicFlag(ctx, def.id, playerId, def.flag.tag));
  }
  const digest = def.flag.keyed ? keyedDigest(ctx, def.id, candidate) : sha256Hex(candidate);
  return safeEqual(digest, def.flag.digest);
}

/** Records the player's dynamic flag digest so submissions of someone else's flag can be detected. */
export async function recordIssuedFlag(ctx: Ctx, def: ChallengeDef, playerId: string): Promise<void> {
  if (def.flag.type !== 'dynamic') return;
  const flag = dynamicFlag(ctx, def.id, playerId, def.flag.tag);
  await cols(ctx).issued_flags.updateOne(
    { _id: `${def.id}:${playerId}` },
    { $setOnInsert: { challenge_id: def.id, player_id: playerId, digest: sha256Hex(flag), issued_at: Date.now() } },
    { upsert: true },
  );
}

/** If `submitted` is another player's issued flag for this challenge, returns that player's id. */
export async function findFlagOwner(ctx: Ctx, def: ChallengeDef, submitted: string): Promise<string | null> {
  if (def.flag.type !== 'dynamic') return null;
  const row = await cols(ctx).issued_flags.findOne({ challenge_id: def.id, digest: sha256Hex(submitted.trim()) });
  return row?.player_id ?? null;
}
