import { cols, type Ctx } from './db';

export type EventSeverity = 'info' | 'warn' | 'alert';

export type EventType =
  | 'player.guest_created'
  | 'player.registered'
  | 'player.login'
  | 'player.login_failed'
  | 'player.logout'
  | 'player.banned'
  | 'player.unbanned'
  | 'player.reset'
  | 'player.deleted'
  | 'challenge.solved'
  | 'challenge.hint_unlocked'
  | 'challenge.reset'
  | 'abuse.rate_limited'
  | 'abuse.flag_sharing'
  | 'abuse.attempt_cap'
  | 'admin.challenge_updated'
  | 'admin.challenge_created'
  | 'admin.challenge_deleted'
  | 'admin.settings_updated';

export interface EventRow {
  id: string;
  ts: number;
  type: EventType;
  severity: EventSeverity;
  player_id: string | null;
  ip: string | null;
  detail: string | null;
}

export async function logEvent(
  ctx: Ctx,
  type: EventType,
  opts: { severity?: EventSeverity; playerId?: string | null; ip?: string | null; detail?: Record<string, unknown> } = {},
): Promise<void> {
  await cols(ctx).events.insertOne({
    ts: Date.now(),
    type,
    severity: opts.severity ?? 'info',
    player_id: opts.playerId ?? null,
    ip: opts.ip ?? null,
    detail: opts.detail ? JSON.stringify(opts.detail) : null,
  });
}

export async function listEvents(ctx: Ctx, opts: { limit?: number; severity?: EventSeverity } = {}): Promise<EventRow[]> {
  const limit = Math.min(Math.max(opts.limit ?? 200, 1), 1000);
  const filter = opts.severity ? { severity: opts.severity } : {};
  const docs = await cols(ctx).events.find(filter).sort({ ts: -1, _id: -1 }).limit(limit).toArray();
  return docs.map((d) => ({
    id: String(d._id),
    ts: d.ts,
    type: d.type as EventType,
    severity: d.severity as EventSeverity,
    player_id: d.player_id,
    ip: d.ip,
    detail: d.detail,
  }));
}
