import crypto from 'node:crypto';
import { z } from 'zod';
import { cols, type Ctx, type PlayerDoc } from './db';
import { AppError } from './errors';
import { getDummyHash, hashPassword, hashPasswordSync, randomId, verifyPassword } from './crypto';
import { logEvent } from './events';

export interface PlayerRow {
  id: string;
  handle: string;
  handle_lower: string;
  password_hash: string | null;
  is_guest: number;
  is_admin: number;
  is_banned: number;
  flagged: number;
  created_at: number;
  last_seen_at: number;
}

/** The shape exposed to the app. Never includes the password hash. */
export interface Player {
  id: string;
  handle: string;
  isGuest: boolean;
  isAdmin: boolean;
  isBanned: boolean;
  createdAt: number;
}

export function toPlayer(row: PlayerRow): Player {
  return {
    id: row.id,
    handle: row.handle,
    isGuest: !!row.is_guest,
    isAdmin: !!row.is_admin,
    isBanned: !!row.is_banned,
    createdAt: row.created_at,
  };
}

function isDuplicateKey(e: unknown): boolean {
  return typeof e === 'object' && e !== null && (e as { code?: number }).code === 11000;
}

export const handleSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9][A-Za-z0-9_.-]{2,23}$/, 'Handle must be 3-24 characters: letters, digits, "_", "." or "-".')
  .refine((h) => !/^guest-/i.test(h), 'Handles starting with "guest-" are reserved.');

export const passwordSchema = z.string().min(10, 'Password must be at least 10 characters.').max(128, 'Password is too long.');

export async function getPlayerById(ctx: Ctx, id: string): Promise<PlayerRow | null> {
  const doc = await cols(ctx).players.findOne({ _id: id }, { projection: { _id: 0 } });
  return (doc as PlayerRow | null) ?? null;
}

export async function getPlayerByHandle(ctx: Ctx, handle: string): Promise<PlayerRow | null> {
  const doc = await cols(ctx).players.findOne({ handle_lower: handle.trim().toLowerCase() }, { projection: { _id: 0 } });
  return (doc as PlayerRow | null) ?? null;
}

async function insertPlayer(ctx: Ctx, p: { handle: string; passwordHash: string | null; isGuest: boolean; isAdmin: boolean }): Promise<PlayerRow> {
  const now = Date.now();
  const id = randomId();
  const doc: PlayerDoc = {
    _id: id,
    id,
    handle: p.handle,
    handle_lower: p.handle.toLowerCase(),
    password_hash: p.passwordHash,
    is_guest: p.isGuest ? 1 : 0,
    is_admin: p.isAdmin ? 1 : 0,
    is_banned: 0,
    flagged: 0,
    created_at: now,
    last_seen_at: now,
  };
  await cols(ctx).players.insertOne(doc);
  return (await getPlayerById(ctx, id))!;
}

export async function createGuest(ctx: Ctx, ip?: string | null): Promise<Player> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const handle = `guest-${crypto.randomBytes(4).toString('hex')}`;
    if (await getPlayerByHandle(ctx, handle)) continue;
    try {
      const row = await insertPlayer(ctx, { handle, passwordHash: null, isGuest: true, isAdmin: false });
      await logEvent(ctx, 'player.guest_created', { playerId: row.id, ip });
      return toPlayer(row);
    } catch (e) {
      if (isDuplicateKey(e)) continue;
      throw e;
    }
  }
  throw new AppError(500, 'guest_failed', 'Could not allocate a guest handle.');
}

/**
 * Registers an account. When the caller is currently a guest, the guest is upgraded
 * in place so solves and hint unlocks carry over. The unique handle index guards races.
 */
export async function registerPlayer(
  ctx: Ctx,
  input: { handle: string; password: string },
  current: Player | null,
  ip?: string | null,
): Promise<Player> {
  const handle = handleSchema.parse(input.handle);
  const password = passwordSchema.parse(input.password);
  if (current && !current.isGuest) throw new AppError(409, 'already_registered', 'You are already signed in to a registered account.');
  const passwordHash = await hashPassword(password);

  if (await getPlayerByHandle(ctx, handle)) throw new AppError(409, 'handle_taken', 'That handle is already taken.');
  let row: PlayerRow;
  try {
    if (current?.isGuest) {
      await cols(ctx).players.updateOne(
        { _id: current.id, is_guest: 1 },
        { $set: { handle, handle_lower: handle.toLowerCase(), password_hash: passwordHash, is_guest: 0 } },
      );
      row = (await getPlayerById(ctx, current.id))!;
    } else {
      row = await insertPlayer(ctx, { handle, passwordHash, isGuest: false, isAdmin: false });
    }
  } catch (e) {
    if (isDuplicateKey(e)) throw new AppError(409, 'handle_taken', 'That handle is already taken.');
    throw e;
  }
  await logEvent(ctx, 'player.registered', { playerId: row.id, ip, detail: { upgradedGuest: !!current?.isGuest } });
  return toPlayer(row);
}

/** Returns the player for valid credentials, otherwise null. Timing does not reveal whether the handle exists. */
export async function authenticate(ctx: Ctx, handle: string, password: string): Promise<Player | null> {
  const row = typeof handle === 'string' ? await getPlayerByHandle(ctx, handle) : null;
  const hash = row?.password_hash ?? (await getDummyHash());
  const ok = await verifyPassword(String(password ?? ''), hash);
  return ok && row?.password_hash ? toPlayer(row) : null;
}

export async function changePassword(ctx: Ctx, playerId: string, current: string, next: string): Promise<void> {
  const row = await getPlayerById(ctx, playerId);
  if (!row?.password_hash) throw new AppError(400, 'no_password', 'Guest sessions have no password. Register first.');
  if (!(await verifyPassword(current, row.password_hash))) throw new AppError(400, 'wrong_password', 'Current password is incorrect.');
  const hash = await hashPassword(passwordSchema.parse(next));
  await cols(ctx).players.updateOne({ _id: playerId }, { $set: { password_hash: hash } });
}

/**
 * Creates or promotes an administrator. Used by the CLI script and by the optional
 * ADMIN_HANDLE / ADMIN_PASSWORD bootstrap. Existing passwords are never overwritten.
 */
export async function upsertAdmin(ctx: Ctx, handle: string, password: string): Promise<{ created: boolean }> {
  const h = z.string().trim().regex(/^[A-Za-z0-9][A-Za-z0-9_.-]{2,23}$/).parse(handle);
  passwordSchema.parse(password);
  const existing = await getPlayerByHandle(ctx, h);
  if (existing) {
    const set: Partial<PlayerDoc> = { is_admin: 1, is_guest: 0 };
    if (!existing.password_hash) set.password_hash = hashPasswordSync(password);
    await cols(ctx).players.updateOne({ _id: existing.id }, { $set: set });
    return { created: false };
  }
  await insertPlayer(ctx, { handle: h, passwordHash: hashPasswordSync(password), isGuest: false, isAdmin: true });
  return { created: true };
}

export async function ensureBootstrapAdmin(ctx: Ctx): Promise<void> {
  const admin = ctx.config.bootstrapAdmin;
  if (!admin) return;
  const existing = await getPlayerByHandle(ctx, admin.handle);
  if (existing?.is_admin) return;
  await upsertAdmin(ctx, admin.handle, admin.password);
}
