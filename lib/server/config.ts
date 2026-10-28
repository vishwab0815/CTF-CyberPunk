import path from 'node:path';

/**
 * Centralised environment parsing. See .env.example for documentation.
 * State lives in MongoDB (no local disk), so the platform runs on serverless hosts.
 */
export interface AppConfig {
  mongoUri: string | null;
  mongoDb: string;
  challengesDir: string;
  flagSecret: string | null;
  flagPrefix: string;
  cookieSecure: boolean;
  trustProxy: boolean;
  appOrigin: string | null;
  bootstrapAdmin: { handle: string; password: string } | null;
  sessionTtlDays: number;
}

function bool(v: string | undefined, fallback: boolean): boolean {
  if (v === undefined || v === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(v.toLowerCase());
}

export function loadConfig(env: Record<string, string | undefined> = process.env): AppConfig {
  const prefix = (env.FLAG_PREFIX || 'RANGE').trim();
  if (!/^[A-Za-z0-9_]{2,16}$/.test(prefix)) {
    throw new Error('FLAG_PREFIX must be 2-16 characters of [A-Za-z0-9_]');
  }
  const adminHandle = env.ADMIN_HANDLE?.trim();
  const adminPassword = env.ADMIN_PASSWORD;
  return {
    mongoUri: env.MONGODB_URI?.trim() || null,
    mongoDb: (env.MONGODB_DB?.trim() || 'nebula_range').replace(/[^A-Za-z0-9_-]/g, ''),
    challengesDir: path.resolve(env.CHALLENGES_DIR || path.join(process.cwd(), 'challenges')),
    flagSecret: env.FLAG_SECRET?.trim() || null,
    flagPrefix: prefix,
    cookieSecure: bool(env.COOKIE_SECURE, env.NODE_ENV === 'production'),
    trustProxy: bool(env.TRUST_PROXY, false),
    appOrigin: env.APP_ORIGIN?.trim() || null,
    bootstrapAdmin: adminHandle && adminPassword ? { handle: adminHandle, password: adminPassword } : null,
    sessionTtlDays: Math.max(1, Number(env.SESSION_TTL_DAYS) || 30),
  };
}
