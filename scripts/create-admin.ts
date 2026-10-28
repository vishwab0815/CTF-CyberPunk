/**
 * Creates (or promotes) an administrator.
 *   pnpm admin:create <handle> <password>
 * or set ADMIN_HANDLE / ADMIN_PASSWORD and start the server.
 */
import { createCtx } from '../lib/server/db';
import { upsertAdmin } from '../lib/server/players';

async function main() {
  const [handle, password] = process.argv.slice(2);
  if (!handle || !password) {
    console.error('usage: pnpm admin:create <handle> <password>   (password >= 10 chars)');
    process.exit(1);
  }
  const ctx = await createCtx();
  const { created } = await upsertAdmin(ctx, handle, password);
  console.log(created ? `Administrator "${handle}" created.` : `"${handle}" promoted to administrator.`);
  await ctx.client.close();
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
