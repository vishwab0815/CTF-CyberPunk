import { json, playerRoute } from '@/lib/server/http';
import { unlockHint } from '@/lib/server/engine';

export const dynamic = 'force-dynamic';

export const POST = playerRoute<{ id: string; index: string }>(async ({ ctx, player, params }) =>
  json({ hint: await unlockHint(ctx, player, params.id, Number(params.index)) }),
);
