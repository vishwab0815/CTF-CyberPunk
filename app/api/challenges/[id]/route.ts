import { json, playerRoute } from '@/lib/server/http';
import { getChallengeDetail } from '@/lib/server/engine';

export const dynamic = 'force-dynamic';

export const GET = playerRoute<{ id: string }>(async ({ ctx, player, params }) => json({ challenge: await getChallengeDetail(ctx, player, params.id) }));
