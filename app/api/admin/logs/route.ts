import { json, adminRoute } from '@/lib/server/http';
import { listSubmissions } from '@/lib/server/admin';
import { listEvents, type EventSeverity } from '@/lib/server/events';

export const dynamic = 'force-dynamic';

export const GET = adminRoute(async ({ ctx, req }) => {
  const sev = req.nextUrl.searchParams.get('severity');
  const severity = sev === 'info' || sev === 'warn' || sev === 'alert' ? (sev as EventSeverity) : undefined;
  const [events, submissions] = await Promise.all([listEvents(ctx, { limit: 500, severity }), listSubmissions(ctx, 300)]);
  return json({ events, submissions });
});
