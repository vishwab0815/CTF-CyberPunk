import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { cols } from '../lib/server/db';
import { clearPackCache, getPackResult } from '../lib/server/registry';
import { dynamicFlag } from '../lib/server/flags';
import { getChallengeDetail, listCatalog, readArtifact, submitFlag, unlockHint } from '../lib/server/engine';
import { computeScoreboard } from '../lib/server/scoring';
import { setBanned, resetChallenge, resetPlayer, setOverride } from '../lib/server/admin';
import { updateSettings } from '../lib/server/settings';
import { upsertAdmin, getPlayerByHandle, toPlayer } from '../lib/server/players';
import { AppError } from '../lib/server/errors';
import { guest, testCtx } from './helpers';

const STATIC = { type: 'static' as const, plain: 'RANGE{static_flag_for_tests}' };

async function expectCode(fn: () => Promise<unknown> | unknown, code: string) {
  try {
    await fn();
  } catch (e) {
    expect(e).toBeInstanceOf(AppError);
    expect((e as AppError).code).toBe(code);
    return;
  }
  throw new Error(`expected AppError ${code}`);
}

describe('flag validation', () => {
  it('accepts the static flag, rejects others', async () => {
    const ctx = await testCtx([{ id: 'a-one', flag: STATIC }]);
    const p = await guest(ctx);
    expect((await submitFlag(ctx, p, 'a-one', 'RANGE{wrong}', null)).correct).toBe(false);
    expect((await submitFlag(ctx, p, 'a-one', `  ${STATIC.plain}  `, null)).correct).toBe(true);
  });

  it('is case sensitive', async () => {
    const ctx = await testCtx([{ id: 'a-one', flag: STATIC }]);
    expect((await submitFlag(ctx, await guest(ctx), 'a-one', STATIC.plain.toLowerCase(), null)).correct).toBe(false);
  });

  it('issues a different dynamic flag per player and only accepts your own', async () => {
    const ctx = await testCtx([{ id: 'dyn-one', flag: { type: 'dynamic', tag: 'dyn' } }]);
    const a = await guest(ctx);
    const b = await guest(ctx);
    const fa = dynamicFlag(ctx, 'dyn-one', a.id, 'dyn');
    const fb = dynamicFlag(ctx, 'dyn-one', b.id, 'dyn');
    expect(fa).not.toBe(fb);
    expect(fa).toMatch(/^RANGE\{dyn_[0-9a-f]{20}\}$/);
    expect((await submitFlag(ctx, a, 'dyn-one', fb, null)).correct).toBe(false);
    expect((await submitFlag(ctx, a, 'dyn-one', fa, null)).correct).toBe(true);
  });

  it('flags both players when a dynamic flag is shared', async () => {
    const ctx = await testCtx([{ id: 'dyn-one', flag: { type: 'dynamic', tag: 'dyn' } }]);
    const a = await guest(ctx);
    const b = await guest(ctx);
    await getChallengeDetail(ctx, a, 'dyn-one'); // issues a's flag
    await submitFlag(ctx, b, 'dyn-one', dynamicFlag(ctx, 'dyn-one', a.id, 'dyn'), null);
    const rows = await cols(ctx).players.find({}, { projection: { flagged: 1, _id: 0 } }).toArray();
    expect(rows.every((r) => r.flagged === 1)).toBe(true);
    expect(await cols(ctx).events.countDocuments({ type: 'abuse.flag_sharing' })).toBe(1);
  });

  it('rejects empty and oversized input', async () => {
    const ctx = await testCtx([{ id: 'a-one', flag: STATIC }]);
    const p = await guest(ctx);
    await expectCode(() => submitFlag(ctx, p, 'a-one', '   ', null), 'bad_request');
    await expectCode(() => submitFlag(ctx, p, 'a-one', 'x'.repeat(300), null), 'bad_request');
    await expectCode(() => submitFlag(ctx, p, 'a-one', { $ne: 1 }, null), 'bad_request');
  });

  it('never stores the correct flag in the submission log', async () => {
    const ctx = await testCtx([{ id: 'a-one', flag: STATIC }]);
    const p = await guest(ctx);
    await submitFlag(ctx, p, 'a-one', STATIC.plain, null);
    const rows = await cols(ctx).submissions.find({}, { projection: { submitted: 1, _id: 0 } }).toArray();
    expect(rows.map((r) => r.submitted)).toEqual(['[correct]']);
  });
});

describe('catalog never leaks secrets', () => {
  it('omits flags, digests and hint text until unlocked', async () => {
    const ctx = await testCtx([{ id: 'a-one', flag: STATIC, hints: [{ title: 'h', text: 'SECRET-HINT-TEXT', cost: 10 }] }]);
    const p = await guest(ctx);
    const text = JSON.stringify([await listCatalog(ctx, p), await getChallengeDetail(ctx, p, 'a-one')]);
    expect(text).not.toContain('SECRET-HINT-TEXT');
    expect(text).not.toContain(STATIC.plain);
    expect(text).not.toMatch(/[0-9a-f]{64}/);
  });
});

describe('prerequisites', () => {
  const packs = [
    { id: 'first', flag: STATIC },
    { id: 'second', requires: ['first'], flag: { type: 'static' as const, plain: 'RANGE{second_flag}' } },
  ];

  it('locks dependants until the prerequisite is solved', async () => {
    const ctx = await testCtx(packs);
    const p = await guest(ctx);
    expect((await listCatalog(ctx, p)).find((c) => c.id === 'second')!.locked).toBe(true);
    await expectCode(() => getChallengeDetail(ctx, p, 'second'), 'forbidden');
    await expectCode(() => submitFlag(ctx, p, 'second', 'RANGE{second_flag}', null), 'forbidden');
    await submitFlag(ctx, p, 'first', STATIC.plain, null);
    expect((await listCatalog(ctx, p)).find((c) => c.id === 'second')!.locked).toBe(false);
    expect((await submitFlag(ctx, p, 'second', 'RANGE{second_flag}', null)).correct).toBe(true);
  });
});

describe('hints and scoring', () => {
  it('charges hint cost once and reveals text only after unlock', async () => {
    const ctx = await testCtx([{ id: 'a-one', points: 200, flag: STATIC, hints: [{ title: 'h', text: 'the text', cost: 50 }] }]);
    const p = await guest(ctx);
    expect((await unlockHint(ctx, p, 'a-one', 0)).text).toBe('the text');
    await unlockHint(ctx, p, 'a-one', 0);
    expect((await getChallengeDetail(ctx, p, 'a-one')).hints[0].text).toBe('the text');
    await submitFlag(ctx, p, 'a-one', STATIC.plain, null);
    expect((await computeScoreboard(ctx)).entries[0].score).toBe(150);
    await expectCode(() => unlockHint(ctx, p, 'a-one', 5), 'not_found');
  });

  it('decays dynamic values with solve count and floors at the minimum', async () => {
    const ctx = await testCtx([{ id: 'a-one', points: 100, flag: STATIC }]);
    await updateSettings(ctx, { scoringMode: 'dynamic', dynamicDecay: 4, dynamicMinRatio: 0.5 });
    const ps = [await guest(ctx), await guest(ctx), await guest(ctx), await guest(ctx), await guest(ctx), await guest(ctx)];
    for (const p of ps) await submitFlag(ctx, p, 'a-one', STATIC.plain, null);
    const board = await computeScoreboard(ctx);
    expect(board.challengeValues['a-one']).toBe(50);
    expect(board.entries.every((e) => e.score === 50)).toBe(true);
  });

  it('ranks by score then earliest last solve', async () => {
    const ctx = await testCtx([
      { id: 'a-one', points: 100, flag: STATIC },
      { id: 'b-two', points: 100, flag: { type: 'static', plain: 'RANGE{b}' } },
    ]);
    const a = await guest(ctx);
    const b = await guest(ctx);
    const c = await guest(ctx);
    await submitFlag(ctx, a, 'a-one', STATIC.plain, null);
    await submitFlag(ctx, b, 'b-two', 'RANGE{b}', null);
    await submitFlag(ctx, c, 'a-one', STATIC.plain, null);
    await submitFlag(ctx, c, 'b-two', 'RANGE{b}', null);
    const e = (await computeScoreboard(ctx)).entries;
    expect(e[0].playerId).toBe(c.id);
    expect(e[1].playerId).toBe(a.id);
  });

  it('excludes admins and banned players, and re-includes after unban', async () => {
    const ctx = await testCtx([{ id: 'a-one', flag: STATIC }]);
    await upsertAdmin(ctx, 'organiser', 'correct horse battery');
    const admin = toPlayer((await getPlayerByHandle(ctx, 'organiser'))!);
    const p = await guest(ctx);
    await submitFlag(ctx, admin, 'a-one', STATIC.plain, null);
    await submitFlag(ctx, p, 'a-one', STATIC.plain, null);
    expect((await computeScoreboard(ctx)).entries.map((e) => e.playerId)).toEqual([p.id]);
    await setBanned(ctx, admin.id, p.id, true);
    expect((await computeScoreboard(ctx)).entries).toHaveLength(0);
    await setBanned(ctx, admin.id, p.id, false);
    expect((await computeScoreboard(ctx)).entries).toHaveLength(1);
  });

  it('freezes the public scoreboard but not the live one', async () => {
    const ctx = await testCtx([{ id: 'a-one', flag: STATIC }]);
    const p = await guest(ctx);
    await updateSettings(ctx, { freezeAt: Date.now() - 1000 });
    await submitFlag(ctx, p, 'a-one', STATIC.plain, null);
    expect((await computeScoreboard(ctx)).entries).toHaveLength(0);
    expect((await computeScoreboard(ctx)).frozen).toBe(true);
    expect((await computeScoreboard(ctx, { live: true })).entries).toHaveLength(1);
  });
});

describe('competition window', () => {
  it('blocks submissions before start and after end, except for admins', async () => {
    const ctx = await testCtx([{ id: 'a-one', flag: STATIC }]);
    const p = await guest(ctx);
    await updateSettings(ctx, { startsAt: Date.now() + 60_000 });
    await expectCode(() => submitFlag(ctx, p, 'a-one', STATIC.plain, null), 'not_started');
    await updateSettings(ctx, { startsAt: null, endsAt: Date.now() - 1 });
    await expectCode(() => submitFlag(ctx, p, 'a-one', STATIC.plain, null), 'ended');
    await upsertAdmin(ctx, 'organiser', 'correct horse battery');
    const admin = toPlayer((await getPlayerByHandle(ctx, 'organiser'))!);
    expect((await submitFlag(ctx, admin, 'a-one', STATIC.plain, null)).correct).toBe(true);
  });
});

describe('rate limits and attempt caps', () => {
  it('rate-limits rapid submissions per player and challenge', async () => {
    const ctx = await testCtx([{ id: 'a-one', flag: STATIC }]);
    const p = await guest(ctx);
    for (let i = 0; i < 8; i++) await submitFlag(ctx, p, 'a-one', `RANGE{guess_${i}}`, null);
    await expectCode(() => submitFlag(ctx, p, 'a-one', 'RANGE{guess_9}', null), 'rate_limited');
    expect(await cols(ctx).events.countDocuments({ type: 'abuse.rate_limited' })).toBe(1);
  });

  it('enforces the per-challenge attempt cap, which an organiser reset lifts', async () => {
    const ctx = await testCtx([{ id: 'a-one', flag: STATIC, maxAttempts: 3 }]);
    await upsertAdmin(ctx, 'organiser', 'correct horse battery');
    const admin = toPlayer((await getPlayerByHandle(ctx, 'organiser'))!);
    const p = await guest(ctx);
    for (let i = 0; i < 3; i++) await submitFlag(ctx, p, 'a-one', `RANGE{g${i}}`, null);
    await expectCode(() => submitFlag(ctx, p, 'a-one', STATIC.plain, null), 'attempt_cap');
    await resetChallenge(ctx, admin.id, 'a-one');
    expect((await submitFlag(ctx, p, 'a-one', STATIC.plain, null)).correct).toBe(true);
  });
});

describe('lifecycle and admin controls', () => {
  it('hides disabled challenges from players but not admins', async () => {
    const ctx = await testCtx([{ id: 'a-one', flag: STATIC }]);
    await upsertAdmin(ctx, 'organiser', 'correct horse battery');
    const admin = toPlayer((await getPlayerByHandle(ctx, 'organiser'))!);
    const p = await guest(ctx);
    await setOverride(ctx, admin.id, 'a-one', { enabled: false });
    expect(await listCatalog(ctx, p)).toHaveLength(0);
    await expectCode(() => getChallengeDetail(ctx, p, 'a-one'), 'not_found');
    expect(await listCatalog(ctx, admin)).toHaveLength(1);
  });

  it('applies point overrides', async () => {
    const ctx = await testCtx([{ id: 'a-one', points: 100, flag: STATIC }]);
    await upsertAdmin(ctx, 'organiser', 'correct horse battery');
    const admin = toPlayer((await getPlayerByHandle(ctx, 'organiser'))!);
    await setOverride(ctx, admin.id, 'a-one', { points: 400 });
    expect((await listCatalog(ctx, await guest(ctx)))[0].basePoints).toBe(400);
  });

  it('resets a player without touching others', async () => {
    const ctx = await testCtx([{ id: 'a-one', flag: STATIC }]);
    await upsertAdmin(ctx, 'organiser', 'correct horse battery');
    const admin = toPlayer((await getPlayerByHandle(ctx, 'organiser'))!);
    const a = await guest(ctx);
    const b = await guest(ctx);
    await submitFlag(ctx, a, 'a-one', STATIC.plain, null);
    await submitFlag(ctx, b, 'a-one', STATIC.plain, null);
    await resetPlayer(ctx, admin.id, a.id);
    expect((await computeScoreboard(ctx)).entries.map((e) => e.playerId)).toEqual([b.id]);
  });

  it('refuses to ban administrators', async () => {
    const ctx = await testCtx([]);
    await upsertAdmin(ctx, 'organiser', 'correct horse battery');
    const admin = toPlayer((await getPlayerByHandle(ctx, 'organiser'))!);
    await expectCode(() => setBanned(ctx, admin.id, admin.id, true), 'bad_request');
  });
});

describe('artifacts', () => {
  const packs = [
    {
      id: 'files-one',
      flag: { type: 'dynamic' as const, tag: 'files' },
      artifacts: [
        { file: 'note.txt', content: 'hello {{HANDLE}}: {{FLAG}}', template: true },
        { file: 'raw.bin', content: 'static-bytes' },
      ],
    },
  ];

  it('templates the per-player flag into artifacts', async () => {
    const ctx = await testCtx(packs);
    const p = await guest(ctx);
    const body = (await readArtifact(ctx, p, 'files-one', 'note.txt')).body.toString();
    expect(body).toBe(`hello ${p.handle}: ${dynamicFlag(ctx, 'files-one', p.id, 'files')}`);
    expect((await readArtifact(ctx, p, 'files-one', 'raw.bin')).body.toString()).toBe('static-bytes');
  });

  it('serves only declared files and rejects traversal attempts', async () => {
    const ctx = await testCtx(packs);
    const p = await guest(ctx);
    for (const bad of ['../challenge.json', '..%2Fchallenge.json', 'challenge.json', '/etc/passwd', 'nope.txt', '..\\..\\x']) {
      await expectCode(() => readArtifact(ctx, p, 'files-one', bad), 'not_found');
    }
  });

  it('does not serve files of locked challenges', async () => {
    const ctx = await testCtx([{ id: 'first', flag: STATIC }, { ...packs[0], requires: ['first'] }]);
    const p = await guest(ctx);
    await expectCode(() => readArtifact(ctx, p, 'files-one', 'raw.bin'), 'forbidden');
  });
});

describe('pack loading', () => {
  it('skips invalid packs without failing the rest, and reports why', async () => {
    const ctx = await testCtx([{ id: 'good-one', flag: STATIC }]);
    const bad = path.join(ctx.config.challengesDir, 'broken');
    fs.mkdirSync(bad);
    fs.writeFileSync(path.join(bad, 'challenge.json'), JSON.stringify({ id: 'Broken ID', points: -5 }));
    const traversal = path.join(ctx.config.challengesDir, 'sneaky');
    fs.mkdirSync(traversal);
    fs.writeFileSync(
      path.join(traversal, 'challenge.json'),
      JSON.stringify({ id: 'sneaky', title: 'Sneaky', category: 'web', difficulty: 'beginner', points: 10, summary: 's', briefing: 'b', flag: { type: 'dynamic', tag: 't' }, artifacts: [{ file: '../challenge.json' }] }),
    );
    clearPackCache();
    expect((await listCatalog(ctx, await guest(ctx))).map((c) => c.id)).toEqual(['good-one']);
    expect(getPackResult(ctx).errors.map((e) => path.basename(e.dir)).sort()).toEqual(['broken', 'sneaky']);
  });
});
