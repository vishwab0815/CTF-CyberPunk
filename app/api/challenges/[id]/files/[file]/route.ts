import { playerRoute } from '@/lib/server/http';
import { readArtifact } from '@/lib/server/engine';
import { tooMany } from '@/lib/server/errors';
import { hitRateLimit, LIMITS } from '@/lib/server/ratelimit';

export const dynamic = 'force-dynamic';

export const GET = playerRoute<{ id: string; file: string }>(async ({ ctx, player, params }) => {
  const rl = await hitRateLimit(ctx, `artifact:${player.id}`, LIMITS.artifactPerPlayer.limit, LIMITS.artifactPerPlayer.windowMs);
  if (!rl.allowed) throw tooMany(rl.retryAfterMs);
  const f = await readArtifact(ctx, player, params.id, params.file);
  return new Response(new Uint8Array(f.body), {
    headers: {
      'Content-Type': f.contentType,
      'Content-Length': String(f.body.length),
      // Always a download: pack files are untrusted content and must never render in our origin.
      'Content-Disposition': `attachment; filename="${f.filename}"`,
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; sandbox",
      'Cache-Control': 'private, no-store',
    },
  });
});
