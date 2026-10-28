import { json, adminRoute } from '@/lib/server/http';
import { logEvent } from '@/lib/server/events';
import { getSettings, settingsSchema, updateSettings } from '@/lib/server/settings';

export const dynamic = 'force-dynamic';

export const GET = adminRoute(async ({ ctx }) => json({ settings: await getSettings(ctx) }));

export const PATCH = adminRoute(async ({ ctx, player, body }) => {
  const patch = settingsSchema.partial().parse(body);
  const settings = await updateSettings(ctx, patch);
  await logEvent(ctx, 'admin.settings_updated', { playerId: player.id, detail: patch });
  return json({ settings });
});
