import { json, adminRoute } from '@/lib/server/http';
import { deletePlayer, resetPlayer, setBanned } from '@/lib/server/admin';
import { badRequest } from '@/lib/server/errors';

export const dynamic = 'force-dynamic';

/** POST { action: "ban" | "unban" | "reset" | "delete" } */
export const POST = adminRoute<{ id: string }>(async ({ ctx, player, params, body }) => {
  const action = (body as { action?: unknown })?.action;
  switch (action) {
    case 'ban':
      await setBanned(ctx, player.id, params.id, true);
      break;
    case 'unban':
      await setBanned(ctx, player.id, params.id, false);
      break;
    case 'reset':
      await resetPlayer(ctx, player.id, params.id);
      break;
    case 'delete':
      await deletePlayer(ctx, player.id, params.id);
      break;
    default:
      throw badRequest('Unknown action.');
  }
  return json({ ok: true });
});
