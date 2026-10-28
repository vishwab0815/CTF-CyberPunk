import { json, playerRoute } from '@/lib/server/http';
import { submitFlag } from '@/lib/server/engine';

export const dynamic = 'force-dynamic';

export const POST = playerRoute<{ id: string }>(async ({ ctx, player, params, body, ip }) => {
  const flag = (body as { flag?: unknown } | null)?.flag;
  const result = await submitFlag(ctx, player, params.id, flag, ip);
  return json(result, { status: result.correct ? 200 : 422 });
});
