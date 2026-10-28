import { json, publicRoute } from '@/lib/server/http';
import { computeScoreboard } from '@/lib/server/scoring';

export const dynamic = 'force-dynamic';

export const GET = publicRoute(async ({ ctx, player }) => {
  const live = !!player?.isAdmin;
  const board = await computeScoreboard(ctx, { live });
  const top = board.entries.slice(0, 100);
  return json({
    frozen: board.frozen,
    generatedAt: board.generatedAt,
    total: board.entries.length,
    entries: top.map((e) => ({
      rank: e.rank,
      handle: e.handle,
      isGuest: e.isGuest,
      score: e.score,
      solves: e.solves,
      lastSolveAt: e.lastSolveAt,
      // Progress series only for the top ten keeps the payload small.
      timeline: e.rank <= 10 ? e.timeline : undefined,
    })),
    me: player ? (board.entries.find((e) => e.playerId === player.id)?.rank ?? null) : null,
  });
});
