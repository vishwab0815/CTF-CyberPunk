import { json, publicRoute } from '@/lib/server/http';
import { cols } from '@/lib/server/db';
import { getAllChallenges } from '@/lib/server/registry';
import { CATEGORIES } from '@/lib/challenges/types';

export const dynamic = 'force-dynamic';

export const GET = publicRoute(async ({ ctx }) => {
  const c = cols(ctx);
  const [players, solves, all] = await Promise.all([
    c.players.countDocuments({ is_admin: 0 }),
    c.solves.countDocuments({}),
    getAllChallenges(ctx),
  ]);
  const enabled = [...all.values()].filter((d) => d.enabled);
  const categories = Object.entries(CATEGORIES).map(([id, cat]) => ({
    id,
    label: cat.label,
    blurb: cat.blurb,
    challenges: enabled.filter((d) => d.category === id).length,
  }));
  return json({ players, solves, challenges: enabled.length, categories });
});
