import { cols, type Ctx } from './db';

export interface RateResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

/**
 * Fixed-window counter persisted in MongoDB, so limits hold across restarts and
 * across the many serverless instances sharing one database.
 */
export async function hitRateLimit(ctx: Ctx, key: string, limit: number, windowMs: number, now = Date.now()): Promise<RateResult> {
  const windowStart = now - (now % windowMs);
  const doc = await cols(ctx).rate_limits.findOneAndUpdate(
    { _id: key },
    [
      {
        $set: {
          count: { $cond: [{ $eq: ['$window_start', windowStart] }, { $add: [{ $ifNull: ['$count', 0] }, 1] }, 1] },
          window_start: windowStart,
        },
      },
    ],
    { upsert: true, returnDocument: 'after' },
  );
  const count = doc?.count ?? 1;

  if (Math.random() < 0.01) {
    await cols(ctx).rate_limits.deleteMany({ window_start: { $lt: now - 24 * 3600_000 } });
  }

  const allowed = count <= limit;
  return {
    allowed,
    remaining: Math.max(0, limit - count),
    retryAfterMs: allowed ? 0 : windowStart + windowMs - now,
  };
}

/** Limits applied by the HTTP layer. Tuned to be invisible to legitimate players. */
export const LIMITS = {
  guestCreatePerIp: { limit: 20, windowMs: 3600_000 },
  registerPerIp: { limit: 10, windowMs: 3600_000 },
  loginPerIp: { limit: 30, windowMs: 15 * 60_000 },
  loginPerHandle: { limit: 10, windowMs: 15 * 60_000 },
  submitPerPlayerChallenge: { limit: 8, windowMs: 60_000 },
  submitPerPlayer: { limit: 30, windowMs: 60_000 },
  submitPerIp: { limit: 60, windowMs: 60_000 },
  artifactPerPlayer: { limit: 60, windowMs: 60_000 },
} as const;
