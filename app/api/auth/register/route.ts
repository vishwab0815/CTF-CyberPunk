import { json, publicRoute, setSessionCookie } from '@/lib/server/http';
import { badRequest, forbidden, tooMany } from '@/lib/server/errors';
import { registerPlayer } from '@/lib/server/players';
import { hitRateLimit, LIMITS } from '@/lib/server/ratelimit';
import { createSession, revokeSession, SESSION_COOKIE } from '@/lib/server/sessions';
import { getSettings } from '@/lib/server/settings';

export const dynamic = 'force-dynamic';

export const POST = publicRoute(async ({ ctx, req, ip, player, body }) => {
  if (!(await getSettings(ctx)).allowRegistration) throw forbidden('Registration is closed.');
  const rl = await hitRateLimit(ctx, `register:${ip ?? 'global'}`, ip ? LIMITS.registerPerIp.limit : 100, LIMITS.registerPerIp.windowMs);
  if (!rl.allowed) throw tooMany(rl.retryAfterMs);

  const { handle, password } = (body ?? {}) as { handle?: unknown; password?: unknown };
  if (typeof handle !== 'string' || typeof password !== 'string') throw badRequest('Handle and password are required.');

  // A guest keeps its solves: the same player row is upgraded in place.
  const registered = await registerPlayer(ctx, { handle, password }, player, ip);
  const oldToken = req.cookies.get(SESSION_COOKIE)?.value;
  if (oldToken) await revokeSession(ctx, oldToken);
  const { token, expiresAt } = await createSession(ctx, registered.id, { ip, userAgent: req.headers.get('user-agent') });
  const res = json({ player: registered }, { status: 201 });
  setSessionCookie(res, ctx, token, expiresAt);
  return res;
});
