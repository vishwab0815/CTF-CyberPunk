import { json, adminRoute } from '@/lib/server/http';
import { adminChallengeList, createCustomChallenge } from '@/lib/server/admin';
import { clearPackCache } from '@/lib/server/registry';

export const dynamic = 'force-dynamic';

export const GET = adminRoute(async ({ ctx }) => {
  clearPackCache(); // lets organisers pick up new pack folders without a restart
  return json(await adminChallengeList(ctx));
});

export const POST = adminRoute(async ({ ctx, player, body }) => {
  await createCustomChallenge(ctx, player.id, body as never);
  return json({ ok: true }, { status: 201 });
});
