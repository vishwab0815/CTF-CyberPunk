import { json, playerRoute, setSessionCookie } from '@/lib/server/http';
import { badRequest } from '@/lib/server/errors';
import { changePassword } from '@/lib/server/players';
import { revokeAllSessions, createSession } from '@/lib/server/sessions';

export const dynamic = 'force-dynamic';

export const POST = playerRoute(async ({ ctx, req, ip, player, body }) => {
  const { current, next } = (body ?? {}) as { current?: unknown; next?: unknown };
  if (typeof current !== 'string' || typeof next !== 'string') throw badRequest('Current and new password are required.');
  await changePassword(ctx, player.id, current, next);
  // Sign out every other device, keep this one on a fresh token.
  await revokeAllSessions(ctx, player.id);
  const { token, expiresAt } = await createSession(ctx, player.id, { ip, userAgent: req.headers.get('user-agent') });
  const res = json({ ok: true });
  setSessionCookie(res, ctx, token, expiresAt);
  return res;
});
