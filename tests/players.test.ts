import { describe, expect, it } from 'vitest';
import { authenticate, changePassword, createGuest, getPlayerByHandle, registerPlayer, toPlayer, upsertAdmin } from '../lib/server/players';
import { createSession, resolveSession, revokeAllSessions, revokeSession } from '../lib/server/sessions';
import { deletePlayer } from '../lib/server/admin';
import { hashPassword, verifyPassword, sha256Hex } from '../lib/server/crypto';
import { hitRateLimit } from '../lib/server/ratelimit';
import { submitFlag } from '../lib/server/engine';
import { computeScoreboard } from '../lib/server/scoring';
import { loadConfig } from '../lib/server/config';
import { cols } from '../lib/server/db';
import { testCtx } from './helpers';

describe('password hashing', () => {
  it('verifies correct passwords and rejects wrong or malformed ones', async () => {
    const h = await hashPassword('a long passphrase');
    expect(h.startsWith('scrypt$')).toBe(true);
    expect(await verifyPassword('a long passphrase', h)).toBe(true);
    expect(await verifyPassword('a long passphrasf', h)).toBe(false);
    expect(await verifyPassword('x', 'not-a-hash')).toBe(false);
  });
  it('salts every hash', async () => {
    expect(await hashPassword('same')).not.toBe(await hashPassword('same'));
  });
});

describe('sessions', () => {
  it('stores only a hash of the token', async () => {
    const ctx = await testCtx();
    const p = await createGuest(ctx);
    const { token } = await createSession(ctx, p.id);
    const rows = await cols(ctx).sessions.find({}).toArray();
    expect(rows[0]._id).toBe(sha256Hex(token));
    expect(rows[0]._id).not.toContain(token);
    expect((await resolveSession(ctx, token))?.id).toBe(p.id);
  });

  it('rejects unknown, revoked and expired tokens', async () => {
    const ctx = await testCtx();
    const p = await createGuest(ctx);
    const { token } = await createSession(ctx, p.id);
    expect(await resolveSession(ctx, 'bogus')).toBeNull();
    expect(await resolveSession(ctx, undefined)).toBeNull();
    await revokeSession(ctx, token);
    expect(await resolveSession(ctx, token)).toBeNull();
    const t2 = (await createSession(ctx, p.id)).token;
    await cols(ctx).sessions.updateMany({}, { $set: { expires_at: Date.now() - 1 } });
    expect(await resolveSession(ctx, t2)).toBeNull();
    const t3 = (await createSession(ctx, p.id)).token;
    await revokeAllSessions(ctx, p.id);
    expect(await resolveSession(ctx, t3)).toBeNull();
  });

  it('isolates players: one session never resolves to another player', async () => {
    const ctx = await testCtx();
    const a = await createGuest(ctx);
    const b = await createGuest(ctx);
    expect((await resolveSession(ctx, (await createSession(ctx, a.id)).token))?.id).toBe(a.id);
    expect((await resolveSession(ctx, (await createSession(ctx, b.id)).token))?.id).toBe(b.id);
  });
});

describe('guest and registered accounts', () => {
  it('upgrades a guest in place and keeps its solves', async () => {
    const ctx = await testCtx([{ id: 'a-one', flag: { type: 'static', plain: 'RANGE{keep_me}' } }]);
    const g = await createGuest(ctx);
    await submitFlag(ctx, g, 'a-one', 'RANGE{keep_me}', null);
    const reg = await registerPlayer(ctx, { handle: 'neo_operator', password: 'a long passphrase' }, g);
    expect(reg.id).toBe(g.id);
    expect(reg.isGuest).toBe(false);
    expect((await computeScoreboard(ctx)).entries[0].handle).toBe('neo_operator');
  });

  it('enforces unique handles case-insensitively and validates input', async () => {
    const ctx = await testCtx();
    await registerPlayer(ctx, { handle: 'Alice_01', password: 'a long passphrase' }, null);
    await expect(registerPlayer(ctx, { handle: 'alice_01', password: 'another passphrase' }, null)).rejects.toMatchObject({ code: 'handle_taken' });
    await expect(registerPlayer(ctx, { handle: 'x', password: 'a long passphrase' }, null)).rejects.toThrow();
    await expect(registerPlayer(ctx, { handle: 'guest-abc', password: 'a long passphrase' }, null)).rejects.toThrow();
    await expect(registerPlayer(ctx, { handle: 'valid_name', password: 'short' }, null)).rejects.toThrow();
  });

  it('authenticates only with the right password and never for guests', async () => {
    const ctx = await testCtx();
    await registerPlayer(ctx, { handle: 'bob_builder', password: 'a long passphrase' }, null);
    expect((await authenticate(ctx, 'BOB_BUILDER', 'a long passphrase'))?.handle).toBe('bob_builder');
    expect(await authenticate(ctx, 'bob_builder', 'wrong password!!')).toBeNull();
    expect(await authenticate(ctx, 'nobody_here', 'a long passphrase')).toBeNull();
    const g = await createGuest(ctx);
    expect(await authenticate(ctx, g.handle, '')).toBeNull();
  });

  it('changes passwords only with the current one', async () => {
    const ctx = await testCtx();
    const p = await registerPlayer(ctx, { handle: 'carol_test', password: 'a long passphrase' }, null);
    await expect(changePassword(ctx, p.id, 'nope nope nope', 'brand new passphrase')).rejects.toMatchObject({ code: 'wrong_password' });
    await changePassword(ctx, p.id, 'a long passphrase', 'brand new passphrase');
    expect(await authenticate(ctx, 'carol_test', 'brand new passphrase')).not.toBeNull();
    expect(await authenticate(ctx, 'carol_test', 'a long passphrase')).toBeNull();
  });

  it('never exposes the password hash on the public Player type', async () => {
    const ctx = await testCtx();
    const p = await registerPlayer(ctx, { handle: 'dave_test', password: 'a long passphrase' }, null);
    expect(JSON.stringify(p)).not.toContain('scrypt');
    expect((await getPlayerByHandle(ctx, 'dave_test'))?.password_hash).toContain('scrypt');
  });
});

describe('rate limiter', () => {
  it('allows up to the limit per window, then blocks, then resets next window', async () => {
    const ctx = await testCtx();
    const t = 1_000_000_000;
    for (let i = 0; i < 3; i++) expect((await hitRateLimit(ctx, 'k', 3, 60_000, t)).allowed).toBe(true);
    const blocked = await hitRateLimit(ctx, 'k', 3, 60_000, t + 10);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
    expect((await hitRateLimit(ctx, 'other', 3, 60_000, t)).allowed).toBe(true);
    expect((await hitRateLimit(ctx, 'k', 3, 60_000, t + 60_000)).allowed).toBe(true);
  });
});

describe('storage', () => {
  it('enforces the unique handle index at the storage layer', async () => {
    const ctx = await testCtx();
    const base = { handle: 'Zed', handle_lower: 'zed', password_hash: null, is_guest: 1, is_admin: 0, is_banned: 0, flagged: 0, created_at: 1, last_seen_at: 1 };
    await cols(ctx).players.insertOne({ _id: 'x1', id: 'x1', ...base });
    await expect(cols(ctx).players.insertOne({ _id: 'x2', id: 'x2', ...base })).rejects.toThrow();
  });

  it('removes a player\'s sessions and solves when the account is deleted', async () => {
    const ctx = await testCtx();
    await upsertAdmin(ctx, 'organiser', 'correct horse battery');
    const admin = toPlayer((await getPlayerByHandle(ctx, 'organiser'))!);
    const p = await createGuest(ctx);
    await createSession(ctx, p.id);
    await cols(ctx).solves.insertOne({ _id: `${p.id}:x`, player_id: p.id, challenge_id: 'x', solved_at: 1 });
    await deletePlayer(ctx, admin.id, p.id);
    expect(await cols(ctx).sessions.countDocuments({})).toBe(0);
    expect(await cols(ctx).solves.countDocuments({})).toBe(0);
  });

  it('validates configuration', () => {
    expect(() => loadConfig({ FLAG_PREFIX: 'bad prefix!' })).toThrow();
    expect(loadConfig({ FLAG_PREFIX: 'HACK' }).flagPrefix).toBe('HACK');
  });
});
