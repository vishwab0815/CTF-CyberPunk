import { json, publicRoute, setSessionCookie } from '@/lib/server/http';
import { AppError, badRequest, tooMany } from '@/lib/server/errors';
import { logEvent } from '@/lib/server/events';
import { authenticate } from '@/lib/server/players';
import { hitRateLimit, LIMITS } from '@/lib/server/ratelimit';
import { createSession, revokeSession, SESSION_COOKIE } from '@/lib/server/sessions';

export const dynamic = 'force-dynamic';

export const POST = publicRoute(async ({ ctx, req, ip, body }) => {
  const { handle, password } = (body ?? {}) as { handle?: unknown; password?: unknown };
  if (typeof handle !== 'string' || typeof password !== 'string' || handle.length > 64 || password.length > 256) {
    throw badRequest('Handle and password are required.');
  }
  const checks = await Promise.all([
    hitRateLimit(ctx, `login:h:${handle.trim().toLowerCase()}`, LIMITS.loginPerHandle.limit, LIMITS.loginPerHandle.windowMs),
    hitRateLimit(ctx, `login:ip:${ip ?? 'global'}`, ip ? LIMITS.loginPerIp.limit : 300, LIMITS.loginPerIp.windowMs),
  ]);
  const blocked = checks.find((c) => !c.allowed);
  if (blocked) {
    await logEvent(ctx, 'abuse.rate_limited', { severity: 'warn', ip, detail: { scope: 'login' } });
    throw tooMany(blocked.retryAfterMs);
  }

  const player = await authenticate(ctx, handle, password);
  if (!player) {
    await logEvent(ctx, 'player.login_failed', { severity: 'warn', ip, detail: { handle: handle.slice(0, 32) } });
    throw new AppError(401, 'bad_credentials', 'Invalid handle or password.');
  }
  if (player.isBanned) throw new AppError(403, 'banned', 'This account has been suspended.');

  const oldToken = req.cookies.get(SESSION_COOKIE)?.value;
  if (oldToken) await revokeSession(ctx, oldToken);
  const { token, expiresAt } = await createSession(ctx, player.id, { ip, userAgent: req.headers.get('user-agent') });
  await logEvent(ctx, 'player.login', { playerId: player.id, ip });
  const res = json({ player });
  setSessionCookie(res, ctx, token, expiresAt);
  return res;
});
