import { json, playerRoute } from '@/lib/server/http';
import { listCatalog } from '@/lib/server/engine';

export const dynamic = 'force-dynamic';

export const GET = playerRoute(async ({ ctx, player }) => json({ challenges: await listCatalog(ctx, player) }));
