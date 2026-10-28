// End-to-end smoke test against a RUNNING server.
//   BASE=http://localhost:3000 ADMIN_HANDLE=organiser ADMIN_PASSWORD=... node scripts/smoke.mjs
// Walks the real HTTP API: guest session, catalog, downloads, wrong/right flags, prerequisites,
// session isolation, CSRF, auth boundaries, admin controls and reset.
const BASE = process.env.BASE || 'http://localhost:3000';
const ORIGIN = new URL(BASE).origin;
let failures = 0;
let checks = 0;

function check(name, cond, extra = '') {
  checks++;
  if (cond) console.log(`  ok   ${name}`);
  else {
    failures++;
    console.log(`  FAIL ${name} ${extra}`);
  }
}

class Client {
  cookie = '';
  async req(method, path, body, headers = {}) {
    const h = { ...headers };
    if (this.cookie) h.cookie = this.cookie;
    if (body !== undefined) h['content-type'] = 'application/json';
    if (method !== 'GET' && h.origin === undefined) h.origin = ORIGIN;
    if (h.origin === null) delete h.origin;
    const res = await fetch(BASE + path, { method, headers: h, body: body !== undefined ? JSON.stringify(body) : undefined, redirect: 'manual' });
    const set = res.headers.getSetCookie?.() ?? [];
    for (const c of set) {
      const [pair] = c.split(';');
      if (pair.endsWith('=')) this.cookie = '';
      else this.cookie = pair;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    let json = null;
    try {
      json = JSON.parse(buf.toString('utf8'));
    } catch {}
    return { status: res.status, json, text: buf.toString('utf8'), headers: res.headers, setCookie: set };
  }
}

const rot13 = (s) => s.replace(/[a-z]/gi, (c) => String.fromCharCode(c.charCodeAt(0) + (c.toLowerCase() <= 'm' ? 13 : -13)));

async function main() {
  console.log('Session & auth boundaries');
  const anon = new Client();
  check('anonymous cannot list challenges (401)', (await anon.req('GET', '/api/challenges')).status === 401);
  check('anonymous cannot read admin overview (401)', (await anon.req('GET', '/api/admin/overview')).status === 401);

  const a = new Client();
  const created = await a.req('POST', '/api/session', {});
  check('guest session created (201)', created.status === 201, JSON.stringify(created.json));
  check('session cookie is HttpOnly + SameSite=Lax', /HttpOnly/i.test(created.setCookie[0] ?? '') && /SameSite=lax/i.test(created.setCookie[0] ?? ''));
  check('guest is not admin', created.json?.player?.isAdmin === false);
  check('admin endpoints forbidden for guests (403)', (await a.req('GET', '/api/admin/overview')).status === 403);

  console.log('CSRF / content-type');
  check('cross-origin POST rejected (403)', (await a.req('POST', '/api/challenges/range-check/submit', { flag: 'x' }, { origin: 'https://evil.example' })).status === 403);
  const form = await fetch(BASE + '/api/challenges/range-check/submit', { method: 'POST', headers: { cookie: a.cookie, origin: ORIGIN, 'content-type': 'application/x-www-form-urlencoded' }, body: 'flag=x' });
  check('form-encoded POST rejected (415)', form.status === 415);

  console.log('Catalog & prerequisites');
  const cat = await a.req('GET', '/api/challenges');
  const ids = (cat.json?.challenges ?? []).map((c) => c.id);
  check('catalog lists the calibration packs', ['range-check', 'layered-encoding', 'ledger-audit'].every((i) => ids.includes(i)), ids.join(','));
  check('catalog never contains a flag or digest', !/RANGE\{|[0-9a-f]{64}/.test(cat.text));
  check('locked brief is refused (403)', (await a.req('GET', '/api/challenges/layered-encoding')).status === 403);
  check('locked artifact is refused (403)', (await a.req('GET', '/api/challenges/layered-encoding/files/transmission.txt')).status === 403);
  check('locked submit is refused (403)', (await a.req('POST', '/api/challenges/layered-encoding/submit', { flag: 'RANGE{x}' })).status === 403);

  console.log('Operation 1: dynamic per-player flag');
  const dl = await a.req('GET', '/api/challenges/range-check/files/range-notes.log');
  check('artifact download ok with attachment + nosniff', dl.status === 200 && /attachment/.test(dl.headers.get('content-disposition') ?? '') && dl.headers.get('x-content-type-options') === 'nosniff');
  const token = dl.text.match(/MAINTENANCE-TOKEN: (\S+)/)?.[1];
  check('player token embedded in artifact', !!token && /^RANGE\{range_check_[0-9a-f]{20}\}$/.test(token), String(token));
  check('path traversal in file name rejected', [404, 400].includes((await a.req('GET', '/api/challenges/range-check/files/..%2Fchallenge.json')).status));
  const bad = await a.req('POST', '/api/challenges/range-check/submit', { flag: 'RANGE{wrong}' });
  check('wrong flag rejected (422, correct=false)', bad.status === 422 && bad.json?.correct === false);
  const unlockHint = await a.req('POST', '/api/challenges/range-check/hints/0', {});
  check('hint unlock returns text', unlockHint.status === 200 && !!unlockHint.json?.hint?.text);
  const good = await a.req('POST', '/api/challenges/range-check/submit', { flag: token });
  check('correct flag accepted (200)', good.status === 200 && good.json?.correct === true);
  check('resubmit is idempotent', (await a.req('POST', '/api/challenges/range-check/submit', { flag: token })).json?.alreadySolved === true);

  console.log('Session isolation');
  const b = new Client();
  await b.req('POST', '/api/session', {});
  const bDl = await b.req('GET', '/api/challenges/range-check/files/range-notes.log');
  const bToken = bDl.text.match(/MAINTENANCE-TOKEN: (\S+)/)?.[1];
  check('second player gets a different token', !!bToken && bToken !== token);
  const stolen = await b.req('POST', '/api/challenges/range-check/submit', { flag: token });
  check("another player's flag is rejected", stolen.status === 422 && stolen.json?.correct === false);
  const bMe = await b.req('GET', '/api/me');
  check('second player has no solves from the first', bMe.json?.progress?.solved?.length === 0);
  check('forged cookie is ignored (401)', (await new Client().req('GET', '/api/me', undefined, { cookie: 'range_session=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' })).status === 401);

  console.log('Operations 2 & 3: static flags unlocked in order');
  check('layered-encoding now unlocked', (await a.req('GET', '/api/challenges/layered-encoding')).status === 200);
  const tx = (await a.req('GET', '/api/challenges/layered-encoding/files/transmission.txt')).text.split('\n\n')[1].replace(/\n/g, '');
  const decoded = rot13(Buffer.from(Buffer.from(tx, 'base64').toString('utf8'), 'hex').toString('utf8'));
  check('decoded flag accepted', (await a.req('POST', '/api/challenges/layered-encoding/submit', { flag: decoded })).json?.correct === true);
  const csv = (await a.req('GET', '/api/challenges/ledger-audit/files/ledger-feb.csv')).text.trim().split('\n').slice(1).map((l) => l.split(','));
  const seen = new Map();
  for (const [id, , , cents] of csv) seen.set(id, [...(seen.get(id) ?? []), Number(cents)]);
  const [dup, amts] = [...seen.entries()].find(([, v]) => v.length > 1);
  const finding = `RANGE{dup_${dup.toLowerCase().replace('-', '_')}_delta_${Math.abs(amts[0] - amts[1])}}`;
  check('analysis finding accepted', (await a.req('POST', '/api/challenges/ledger-audit/submit', { flag: finding })).json?.correct === true);

  console.log('Scoring & persistence');
  const me = await a.req('GET', '/api/me');
  check('score = 50+100+200 minus 10 hint cost = 340', me.json?.progress?.score === 340, String(me.json?.progress?.score));
  const board = await new Client().req('GET', '/api/scoreboard');
  check('public scoreboard lists the player', board.json?.entries?.some((e) => e.score === 340));

  console.log('Rate limiting');
  let limited = false;
  for (let i = 0; i < 12 && !limited; i++) {
    const r = await b.req('POST', '/api/challenges/range-check/submit', { flag: `RANGE{spam_${i}}` });
    if (r.status === 429) limited = true;
  }
  check('rapid wrong submissions are rate limited (429)', limited);

  console.log('Registration keeps guest progress');
  const handle = `smoke_${Date.now().toString(36)}`;
  const reg = await a.req('POST', '/api/auth/register', { handle, password: 'a long smoke passphrase' });
  check('guest upgraded to registered account', reg.status === 201 && reg.json?.player?.isGuest === false && reg.json?.player?.id === created.json.player.id);
  check('solves survive the upgrade', (await a.req('GET', '/api/me')).json?.progress?.solved?.length === 3);
  const login = new Client();
  check('wrong password rejected (401)', (await login.req('POST', '/api/auth/login', { handle, password: 'not the password!!' })).status === 401);
  const ok = await login.req('POST', '/api/auth/login', { handle, password: 'a long smoke passphrase' });
  check('login works from a fresh client', ok.status === 200 && (await login.req('GET', '/api/me')).json?.progress?.solved?.length === 3);

  if (process.env.ADMIN_HANDLE && process.env.ADMIN_PASSWORD) {
    console.log('Admin controls');
    const adm = new Client();
    const al = await adm.req('POST', '/api/auth/login', { handle: process.env.ADMIN_HANDLE, password: process.env.ADMIN_PASSWORD });
    check('admin login', al.status === 200 && al.json?.player?.isAdmin === true);
    const ov = await adm.req('GET', '/api/admin/overview');
    check('admin overview loads', ov.status === 200 && ov.json?.challenges?.length >= 3);
    check('flag-sharing attempt was logged as an alert', ov.json?.events?.some((e) => e.type === 'abuse.flag_sharing'));
    check('overview never exposes password hashes', !/scrypt\$/.test(ov.text));
    check('admin can disable a challenge', (await adm.req('PATCH', '/api/admin/challenges/ledger-audit', { enabled: false })).status === 200);
    check('disabled challenge hidden from players', !(await a.req('GET', '/api/challenges')).json.challenges.some((c) => c.id === 'ledger-audit'));
    await adm.req('PATCH', '/api/admin/challenges/ledger-audit', { enabled: true });
    check('admin reset clears a challenge', (await adm.req('POST', '/api/admin/challenges/range-check', { action: 'reset' })).status === 200);
    check('player progress for it is gone after reset', (await a.req('GET', '/api/me')).json?.progress?.solved?.length === 2);
    const target = ov.json.players.find((p) => p.handle === handle);
    check('admin can ban a player', (await adm.req('POST', `/api/admin/players/${target.id}`, { action: 'ban' })).status === 200);
    check('banned player session is revoked (401)', (await a.req('GET', '/api/me')).status === 401);
    check('banned player cannot log back in (403)', (await new Client().req('POST', '/api/auth/login', { handle, password: 'a long smoke passphrase' })).status === 403);
  } else {
    console.log('(skipping admin checks: set ADMIN_HANDLE and ADMIN_PASSWORD)');
  }

  console.log(`\n${checks - failures}/${checks} checks passed`);
  process.exit(failures ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
