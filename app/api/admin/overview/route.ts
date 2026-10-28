import { json, adminRoute } from '@/lib/server/http';
import { cols } from '@/lib/server/db';
import { adminChallengeList, listPlayers } from '@/lib/server/admin';
import { listEvents } from '@/lib/server/events';
import { getSettings } from '@/lib/server/settings';

export const dynamic = 'force-dynamic';

export const GET = adminRoute(async ({ ctx }) => {
  const c = cols(ctx);
  const [players, guests, flagged, solves, submissions, alerts, settings, challengeList, playerList, events] = await Promise.all([
    c.players.countDocuments({ is_admin: 0 }),
    c.players.countDocuments({ is_guest: 1 }),
    c.players.countDocuments({ flagged: 1 }),
    c.solves.countDocuments({}),
    c.submissions.countDocuments({}),
    c.events.countDocuments({ severity: 'alert' }),
    getSettings(ctx),
    adminChallengeList(ctx),
    listPlayers(ctx),
    listEvents(ctx, { limit: 100 }),
  ]);
  return json({
    counts: { players, guests, flagged, solves, submissions, alerts },
    settings,
    ...challengeList,
    players: playerList,
    events,
  });
});
