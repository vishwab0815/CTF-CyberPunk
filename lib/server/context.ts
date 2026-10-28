import { createCtx, type Ctx } from './db';
import { ensureBootstrapAdmin } from './players';
import { purgeExpiredSessions } from './sessions';

declare global {
  var __rangeCtx: Promise<Ctx> | undefined;
}

/** Process-wide context. Cached on globalThis so serverless invocations reuse one connection. */
export function getCtx(): Promise<Ctx> {
  if (!globalThis.__rangeCtx) {
    globalThis.__rangeCtx = (async () => {
      const ctx = await createCtx();
      await ensureBootstrapAdmin(ctx);
      await purgeExpiredSessions(ctx);
      return ctx;
    })();
  }
  return globalThis.__rangeCtx;
}
