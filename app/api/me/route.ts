import { json, playerRoute } from '@/lib/server/http';
import { getProgress } from '@/lib/server/engine';
import { computeScoreboard } from '@/lib/server/scoring';

export const dynamic = 'force-dynamic';

export const GET = playerRoute(async ({ ctx, player }) => {
  const board = await computeScoreboard(ctx, { live: true });
  const ranks = new Map(board.entries.map((e) => [e.playerId, { rank: e.rank, score: e.score }]));
  return json({ player, progress: await getProgress(ctx, player, ranks, board.challengeValues) });
});
