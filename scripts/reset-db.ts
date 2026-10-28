/**
 * Wipes all players, sessions, solves and logs. Challenge packs and settings
 * (including the flag secret) are untouched.
 *   pnpm db:reset --yes
 */
import { createCtx, cols } from '../lib/server/db';

async function main() {
  if (!process.argv.includes('--yes')) {
    console.error('This deletes ALL players and progress. Re-run with --yes to confirm.');
    process.exit(1);
  }
  const ctx = await createCtx();
  const c = cols(ctx);
  await Promise.all([
    c.solves.deleteMany({}),
    c.submissions.deleteMany({}),
    c.hint_unlocks.deleteMany({}),
    c.issued_flags.deleteMany({}),
    c.sessions.deleteMany({}),
    c.events.deleteMany({}),
    c.rate_limits.deleteMany({}),
    c.custom_challenges.deleteMany({}),
    c.challenge_overrides.deleteMany({}),
    c.players.deleteMany({}),
  ]);
  console.log('Database reset.');
  await ctx.client.close();
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
