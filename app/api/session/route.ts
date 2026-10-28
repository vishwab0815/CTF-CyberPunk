import { json, publicRoute, setSessionCookie, clearSessionCookie } from '@/lib/server/http';
import { forbidden, tooMany } from '@/lib/server/errors';
import { createGuest } from '@/lib/server/players';
import { hitRateLimit, LIMITS } from '@/lib/server/ratelimit';
import { createSession, revokeSession, SESSION_COOKIE } from '@/lib/server/sessions';
import { competitionPhase, getSettings } from '@/lib/server/settings';

export const dynamic = 'force-dynamic';

export const GET = publicRoute(async ({ ctx, player }) => {
  const s = await getSettings(ctx);
  return json({
    player,
    competition: {
      phase: competitionPhase(s),
      startsAt: s.startsAt,
      endsAt: s.endsAt,
      freezeAt: s.freezeAt,
      scoringMode: s.scoringMode,
      allowGuests: s.allowGuests,
      allowRegistration: s.allowRegistration,
    },
    flagFormat: `${ctx.config.flagPrefix}{...}`,
  });
});

/** Starts a guest session (no credentials needed). */
export const POST = publicRoute(async ({ ctx, req, ip, player }) => {
  if (player) return json({ player });
  if (!(await getSettings(ctx)).allowGuests) throw forbidden('Guest play is disabled. Register an account.');
  const rl = ip
    ? await hitRateLimit(ctx, `guest:${ip}`, LIMITS.guestCreatePerIp.limit, LIMITS.guestCreatePerIp.windowMs)
    : await hitRateLimit(ctx, 'guest:global', 300, 3600_000);
  if (!rl.allowed) throw tooMany(rl.retryAfterMs);
  const created = await createGuest(ctx, ip);
  const { token, expiresAt } = await createSession(ctx, created.id, { ip, userAgent: req.headers.get('user-agent') });
  const res = json({ player: created }, { status: 201 });
  setSessionCookie(res, ctx, token, expiresAt);
  return res;
});

export const DELETE = publicRoute(async ({ ctx, req }) => {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (token) await revokeSession(ctx, token);
  const res = json({ ok: true });
  clearSessionCookie(res, ctx);
  return res;
});
