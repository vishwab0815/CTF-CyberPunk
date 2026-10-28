import { json, publicRoute } from '@/lib/server/http';

export const dynamic = 'force-dynamic';

/**
 * Liveness check that also pings MongoDB. A scheduled hit (see vercel.json crons)
 * keeps a free-tier Atlas cluster from pausing after long inactivity.
 */
export const GET = publicRoute(async ({ ctx }) => {
  await ctx.db.command({ ping: 1 });
  return json({ ok: true, ts: Date.now() });
});
