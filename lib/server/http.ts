import { NextResponse, type NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { getCtx } from './context';
import type { Ctx } from './db';
import { AppError, forbidden, unauthorized } from './errors';
import type { Player } from './players';
import { resolveSession, SESSION_COOKIE } from './sessions';

export interface Req<P extends Record<string, string> = Record<string, string>> {
  req: NextRequest;
  ctx: Ctx;
  player: Player | null;
  ip: string | null;
  params: P;
  /** Parsed JSON body (empty object when absent). */
  body: unknown;
}

type Handler<P extends Record<string, string>> = (r: Req<P> & { player: Player }) => Promise<Response> | Response;
type OptHandler<P extends Record<string, string>> = (r: Req<P>) => Promise<Response> | Response;

const MAX_BODY_BYTES = 32 * 1024;

export function clientIp(req: NextRequest, trustProxy: boolean): string | null {
  if (trustProxy) {
    const xff = req.headers.get('x-forwarded-for');
    const first = xff?.split(',')[0]?.trim();
    if (first && first.length <= 45) return first;
    const real = req.headers.get('x-real-ip');
    if (real && real.length <= 45) return real;
  }
  return null;
}

/**
 * Rejects cross-site writes. Browsers always send Origin on cross-origin POSTs; when it is
 * absent we only accept requests that Sec-Fetch-Site marks as same-origin (or non-browser).
 */
function assertSameOrigin(req: NextRequest, ctx: Ctx): void {
  const origin = req.headers.get('origin');
  if (origin) {
    const allowed = ctx.config.appOrigin ?? `${req.nextUrl.protocol}//${req.headers.get('host')}`;
    if (origin !== allowed) throw forbidden('Cross-origin request rejected.');
    return;
  }
  const site = req.headers.get('sec-fetch-site');
  if (site && site !== 'same-origin' && site !== 'none') throw forbidden('Cross-origin request rejected.');
}

async function readBody(req: NextRequest): Promise<unknown> {
  const declared = Number(req.headers.get('content-length') ?? 0);
  if (declared > MAX_BODY_BYTES) throw new AppError(413, 'too_large', 'Request body too large.');
  const type = req.headers.get('content-type') ?? '';
  if (!type.toLowerCase().startsWith('application/json')) {
    const text = await req.text();
    if (text.length > 0) throw new AppError(415, 'bad_content_type', 'Send application/json.');
    return {};
  }
  const text = await req.text();
  if (text.length > MAX_BODY_BYTES) throw new AppError(413, 'too_large', 'Request body too large.');
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new AppError(400, 'bad_json', 'Malformed JSON.');
  }
}

export function json(data: unknown, init?: ResponseInit): NextResponse {
  const res = NextResponse.json(data, init);
  res.headers.set('Cache-Control', 'no-store');
  return res;
}

export function setSessionCookie(res: NextResponse, ctx: Ctx, token: string, expiresAt: number): void {
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: ctx.config.cookieSecure,
    path: '/',
    expires: new Date(expiresAt),
  });
}

export function clearSessionCookie(res: NextResponse, ctx: Ctx): void {
  res.cookies.set(SESSION_COOKIE, '', { httpOnly: true, sameSite: 'lax', secure: ctx.config.cookieSecure, path: '/', maxAge: 0 });
}

function toErrorResponse(err: unknown): NextResponse {
  if (err instanceof AppError) {
    const res = json({ error: { code: err.code, message: err.message, ...err.extra } }, { status: err.status });
    const retry = err.extra?.retryAfterMs;
    if (typeof retry === 'number') res.headers.set('Retry-After', String(Math.ceil(retry / 1000)));
    return res;
  }
  if (err instanceof ZodError) {
    return json({ error: { code: 'invalid_input', message: err.issues[0]?.message ?? 'Invalid input.' } }, { status: 400 });
  }
  console.error('[range] unhandled error', err);
  return json({ error: { code: 'internal', message: 'Internal error.' } }, { status: 500 });
}

type RouteCtx = { params: Promise<Record<string, string>> };
type Level = 'public' | 'player' | 'admin';

function make<P extends Record<string, string>>(level: Level, handler: OptHandler<P>) {
  return async (req: NextRequest, route: RouteCtx): Promise<Response> => {
    try {
      const ctx = await getCtx();
      const safeMethod = req.method === 'GET' || req.method === 'HEAD';
      if (!safeMethod) assertSameOrigin(req, ctx);
      const player = await resolveSession(ctx, req.cookies.get(SESSION_COOKIE)?.value);
      if (level !== 'public' && !player) throw unauthorized();
      if (level === 'admin' && !player!.isAdmin) throw forbidden('Administrator access required.');
      if (player?.isBanned && !safeMethod) throw forbidden('This account has been suspended.');
      const body = safeMethod ? {} : await readBody(req);
      return await handler({ req, ctx, player, ip: clientIp(req, ctx.config.trustProxy), params: (await route.params) as P, body });
    } catch (err) {
      return toErrorResponse(err);
    }
  };
}

/** Anyone, signed in or not. */
export const publicRoute = <P extends Record<string, string> = Record<string, string>>(h: OptHandler<P>) => make<P>('public', h);
/** Requires a session (guest or registered). */
export const playerRoute = <P extends Record<string, string> = Record<string, string>>(h: Handler<P>) => make<P>('player', h as OptHandler<P>);
/** Requires an administrator. */
export const adminRoute = <P extends Record<string, string> = Record<string, string>>(h: Handler<P>) => make<P>('admin', h as OptHandler<P>);
