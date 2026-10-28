import { json, adminRoute } from '@/lib/server/http';
import { deleteCustomChallenge, overrideSchema, resetChallenge, setOverride } from '@/lib/server/admin';
import { badRequest } from '@/lib/server/errors';

export const dynamic = 'force-dynamic';

export const PATCH = adminRoute<{ id: string }>(async ({ ctx, player, params, body }) => {
  await setOverride(ctx, player.id, params.id, overrideSchema.parse(body));
  return json({ ok: true });
});

export const DELETE = adminRoute<{ id: string }>(async ({ ctx, player, params }) => {
  await deleteCustomChallenge(ctx, player.id, params.id);
  return json({ ok: true });
});

/** POST { action: "reset" } clears all progress on this challenge. */
export const POST = adminRoute<{ id: string }>(async ({ ctx, player, params, body }) => {
  if ((body as { action?: unknown })?.action !== 'reset') throw badRequest('Unknown action.');
  await resetChallenge(ctx, player.id, params.id);
  return json({ ok: true });
});
