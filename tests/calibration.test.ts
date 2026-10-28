import crypto from 'node:crypto';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { cols, createCtx, type Ctx } from '../lib/server/db';
import { loadConfig } from '../lib/server/config';
import { clearPackCache, getPackResult } from '../lib/server/registry';
import { getChallengeDetail, listCatalog, readArtifact, submitFlag } from '../lib/server/engine';
import { computeScoreboard } from '../lib/server/scoring';
import { createGuest, type Player } from '../lib/server/players';
import { testMongoUri } from './mongo';

async function realCtx(): Promise<Ctx> {
  clearPackCache();
  const uri = await testMongoUri();
  return createCtx(loadConfig({ MONGODB_URI: uri, MONGODB_DB: `calib_${crypto.randomBytes(6).toString('hex')}`, CHALLENGES_DIR: path.join(process.cwd(), 'challenges') }));
}

const download = async (ctx: Ctx, p: Player, id: string, file: string) => (await readArtifact(ctx, p, id, file)).body.toString('utf8');
const downloadBytes = async (ctx: Ctx, p: Player, id: string, file: string) => (await readArtifact(ctx, p, id, file)).body;

describe('shipped calibration packs', () => {
  it('all load without errors', async () => {
    const ctx = await realCtx();
    expect(getPackResult(ctx).errors).toEqual([]);
    expect(getPackResult(ctx).challenges.map((c) => c.id).sort()).toEqual([
      'binary-ghost', 'breadcrumbs', 'buried-signal', 'container-escape-plan',
      'crime-scene', 'dead-drop', 'exposed-api', 'ghost-in-the-wire', 'hash-heist',
      'layered-encoding', 'ledger-audit', 'operation-blackout', 'packet-storm',
      'priv-escalation', 'range-check', 'rsa-paper', 'ticket-to-ride',
      'token-forge', 'wire-trap',
    ]);
  });

  it('can be solved end to end from the downloaded evidence, in prerequisite order', async () => {
    const ctx = await realCtx();
    const p = await createGuest(ctx);

    // Chain is locked until its prerequisites are met.
    const locked = async (id: string) => (await listCatalog(ctx, p)).find((c) => c.id === id)!.locked;
    expect(await locked('layered-encoding')).toBe(true);
    expect(await locked('ledger-audit')).toBe(true);

    // 1. grep the odd line out of the log.
    const log = await download(ctx, p, 'range-check', 'range-notes.log');
    const token = log.split('\n').find((l) => l.startsWith('MAINTENANCE-TOKEN: '))!.slice('MAINTENANCE-TOKEN: '.length);
    expect((await submitFlag(ctx, p, 'range-check', 'RANGE{not_it}', null)).correct).toBe(false);
    expect((await submitFlag(ctx, p, 'range-check', token, null)).correct).toBe(true);
    expect(await locked('layered-encoding')).toBe(false);

    // 2. undo base64 -> hex -> rot13.
    const b64 = (await download(ctx, p, 'layered-encoding', 'transmission.txt')).split('\n\n')[1].replace(/\n/g, '');
    const hex = Buffer.from(b64, 'base64').toString('utf8');
    const rotated = Buffer.from(hex, 'hex').toString('utf8');
    const decoded = rotated.replace(/[a-z]/gi, (c) => String.fromCharCode(c.charCodeAt(0) + (c.toLowerCase() <= 'm' ? 13 : -13)));
    expect((await submitFlag(ctx, p, 'layered-encoding', decoded, null)).correct).toBe(true);

    // 3. find the duplicated id and the delta.
    const rows = (await download(ctx, p, 'ledger-audit', 'ledger-feb.csv')).trim().split('\n').slice(1).map((l) => l.split(','));
    const byId = new Map<string, number[]>();
    for (const [id, , , cents] of rows) byId.set(id, [...(byId.get(id) ?? []), Number(cents)]);
    const [dupId, amounts] = [...byId.entries()].find(([, v]) => v.length > 1)!;
    const finding = `RANGE{dup_${dupId.toLowerCase().replace('-', '_')}_delta_${Math.abs(amounts[0] - amounts[1])}}`;
    expect((await submitFlag(ctx, p, 'ledger-audit', finding, null)).correct).toBe(true);

    const board = await computeScoreboard(ctx);
    expect(board.entries[0].score).toBe(350);
    expect(board.entries[0].solves).toBe(3);
  });

  it('gives each player a different token in the dynamic challenge', async () => {
    const ctx = await realCtx();
    const a = await createGuest(ctx);
    const b = await createGuest(ctx);
    const tok = async (p: Player) => (await download(ctx, p, 'range-check', 'range-notes.log')).match(/MAINTENANCE-TOKEN: (\S+)/)![1];
    const ta = await tok(a);
    expect(ta).not.toBe(await tok(b));
    expect((await submitFlag(ctx, b, 'range-check', ta, null)).correct).toBe(false);
    expect(await cols(ctx).events.countDocuments({ type: 'abuse.flag_sharing' })).toBe(1);
  });

  it('does not leak the static flags through any API shape', async () => {
    const ctx = await realCtx();
    const p = await createGuest(ctx);
    const everything = JSON.stringify([await listCatalog(ctx, p), await getChallengeDetail(ctx, p, 'range-check')]);
    expect(everything).not.toContain('encoding_is_not_encryption');
    expect(everything).not.toContain('dup_inv_48213');
  });
});

describe('operation nightfall + field operations packs', () => {
  async function solveCalibration(ctx: Ctx, p: Player) {
    const log = await download(ctx, p, 'range-check', 'range-notes.log');
    const token = log.split('\n').find((l) => l.startsWith('MAINTENANCE-TOKEN: '))!.slice('MAINTENANCE-TOKEN: '.length);
    await submitFlag(ctx, p, 'range-check', token, null);
    const b64 = (await download(ctx, p, 'layered-encoding', 'transmission.txt')).split('\n\n')[1].replace(/\n/g, '');
    const hex = Buffer.from(b64, 'base64').toString('utf8');
    const rotated = Buffer.from(hex, 'hex').toString('utf8');
    const decoded = rotated.replace(/[a-z]/gi, (c) => String.fromCharCode(c.charCodeAt(0) + (c.toLowerCase() <= 'm' ? 13 : -13)));
    await submitFlag(ctx, p, 'layered-encoding', decoded, null);
    const rows = (await download(ctx, p, 'ledger-audit', 'ledger-feb.csv')).trim().split('\n').slice(1).map((l) => l.split(','));
    const byId = new Map<string, number[]>();
    for (const [id, , , cents] of rows) byId.set(id, [...(byId.get(id) ?? []), Number(cents)]);
    const [dupId, amounts] = [...byId.entries()].find(([, v]) => v.length > 1)!;
    await submitFlag(ctx, p, 'ledger-audit', `RANGE{dup_${dupId.toLowerCase().replace('-', '_')}_delta_${Math.abs(amounts[0] - amounts[1])}}`, null);
  }

  it('dead-drop: DNS tunnel hex decode', async () => {
    const ctx = await realCtx();
    const p = await createGuest(ctx);
    await solveCalibration(ctx, p);
    const dns = await download(ctx, p, 'dead-drop', 'dns-queries.log');
    const hexParts = dns.split('\n').filter((l) => l.includes('exfil.nebula.test')).map((l) => l.match(/TXT (\w+)\.exfil\.nebula\.test/)![1]);
    const flag = Buffer.from(hexParts.join(''), 'hex').toString('utf8');
    expect((await submitFlag(ctx, p, 'dead-drop', flag, null)).correct).toBe(true);
  });

  it('exposed-api: flag in debug response', async () => {
    const ctx = await realCtx();
    const p = await createGuest(ctx);
    await solveCalibration(ctx, p);
    const resp = await download(ctx, p, 'exposed-api', 'debug-response.json');
    const flag = JSON.parse(resp).flag;
    expect((await submitFlag(ctx, p, 'exposed-api', flag, null)).correct).toBe(true);
  });

  it('token-forge: JWT secret brute force', async () => {
    const ctx = await realCtx();
    const p = await createGuest(ctx);
    await solveCalibration(ctx, p);
    await submitFlag(ctx, p, 'exposed-api', 'RANGE{debug_endpoint_exposed_4e9b}', null);

    const tokenFile = await download(ctx, p, 'token-forge', 'captured-token.txt');
    const jwt = tokenFile.split('\n').find((l) => !l.startsWith('#') && l.trim().split('.').length === 3)!.trim();
    const [headerB64, payloadB64, sigB64] = jwt.split('.');
    const wordlist = (await download(ctx, p, 'token-forge', 'common-secrets.txt')).trim().split('\n');

    let secret = '';
    for (const word of wordlist) {
      const sig = crypto.createHmac('sha256', word).update(`${headerB64}.${payloadB64}`).digest('base64url');
      if (sig === sigB64) { secret = word; break; }
    }
    expect(secret).toBe('nightfall');
    expect((await submitFlag(ctx, p, 'token-forge', `RANGE{jwt_secret_${secret}_cracked}`, null)).correct).toBe(true);
  });

  it('rsa-paper: factor and decrypt', async () => {
    const ctx = await realCtx();
    const p = await createGuest(ctx);
    await solveCalibration(ctx, p);

    const interceptTxt = await download(ctx, p, 'rsa-paper', 'intercept.txt');
    const n = BigInt(interceptTxt.match(/n = (\d+)/)![1]);
    const e = BigInt(interceptTxt.match(/e = (\d+)/)![1]);
    const ciphertextLines = interceptTxt.split('textbook RSA):\n')[1].split('\n=')[0].trim().split('\n').filter(Boolean);
    const ZERO = BigInt(0), ONE = BigInt(1), TWO = BigInt(2), THREE = BigInt(3);

    let pFactor = ZERO;
    for (let i = THREE; i * i <= n; i += TWO) {
      if (n % i === ZERO) { pFactor = i; break; }
    }
    const qFactor = n / pFactor;
    expect(pFactor * qFactor).toBe(n);

    const phi = (pFactor - ONE) * (qFactor - ONE);
    function modinv(a: bigint, m: bigint) {
      let [old_r, r] = [a, m];
      let [old_s, s] = [ONE, ZERO];
      while (r !== ZERO) {
        const q = old_r / r;
        [old_r, r] = [r, old_r - q * r];
        [old_s, s] = [s, old_s - q * s];
      }
      return ((old_s % m) + m) % m;
    }
    const d = modinv(e, phi);
    function modpow(base: bigint, exp: bigint, mod: bigint) {
      let result = ONE;
      base = ((base % mod) + mod) % mod;
      while (exp > ZERO) {
        if (exp & ONE) result = (result * base) % mod;
        exp >>= ONE;
        base = (base * base) % mod;
      }
      return result;
    }

    const plaintext = ciphertextLines.map((c) => String.fromCharCode(Number(modpow(BigInt(c.trim()), d, n)))).join('');
    expect(plaintext).toMatch(/^RANGE\{/);
    expect((await submitFlag(ctx, p, 'rsa-paper', plaintext, null)).correct).toBe(true);
  });

  it('wire-trap: reassemble HTTP stream from real pcap', async () => {
    const ctx = await realCtx();
    const p = await createGuest(ctx);
    await solveCalibration(ctx, p);
    await submitFlag(ctx, p, 'dead-drop', 'RANGE{dns_tunnel_exfil_7a3f}', null); // unlock wire-trap

    const pcap = await downloadBytes(ctx, p, 'wire-trap', 'capture.pcap');
    expect(pcap.readUInt32LE(0)).toBe(0xa1b2c3d4); // libpcap magic
    let off = 24;
    let serverPayload = Buffer.alloc(0);
    while (off + 16 <= pcap.length) {
      const incl = pcap.readUInt32LE(off + 8);
      const pkt = pcap.subarray(off + 16, off + 16 + incl);
      off += 16 + incl;
      const ihl = (pkt[14] & 0x0f) * 4;
      if (pkt[23] !== 6) continue; // TCP only
      const l4 = 14 + ihl;
      const srcPort = pkt.readUInt16BE(l4);
      const dataOff = (pkt[l4 + 12] >> 4) * 4;
      const data = pkt.subarray(l4 + dataOff);
      if (srcPort === 80) serverPayload = Buffer.concat([serverPayload, data]);
    }
    const bodyB64 = serverPayload.toString('utf8').split('\r\n\r\n')[1];
    const flag = Buffer.from(bodyB64, 'base64').toString('utf8');
    expect((await submitFlag(ctx, p, 'wire-trap', flag, null)).correct).toBe(true);
  });

  it('binary-ghost: XOR-decode payload from real ELF .rodata', async () => {
    const ctx = await realCtx();
    const p = await createGuest(ctx);
    await solveCalibration(ctx, p);
    await submitFlag(ctx, p, 'rsa-paper', 'RANGE{textbook_rsa_no_padding_9d2a}', null); // unlock binary-ghost

    const elf = await downloadBytes(ctx, p, 'binary-ghost', 'beacon');
    expect(elf.subarray(1, 4).toString('ascii')).toBe('ELF');
    const shoff = Number(elf.readBigUInt64LE(40));
    const shentsize = elf.readUInt16LE(58);
    const shnum = elf.readUInt16LE(60);
    const shstrndx = elf.readUInt16LE(62);
    const strtabOff = Number(elf.readBigUInt64LE(shoff + shstrndx * shentsize + 24));
    const sectionName = (nameOff: number) => {
      let end = strtabOff + nameOff;
      while (elf[end] !== 0) end++;
      return elf.toString('ascii', strtabOff + nameOff, end);
    };
    let rodataOff = 0, rodataSize = 0;
    for (let i = 0; i < shnum; i++) {
      const base = shoff + i * shentsize;
      if (sectionName(elf.readUInt32LE(base)) === '.rodata') {
        rodataOff = Number(elf.readBigUInt64LE(base + 24));
        rodataSize = Number(elf.readBigUInt64LE(base + 32));
      }
    }
    const rodata = elf.subarray(rodataOff, rodataOff + rodataSize);
    const decoded = Buffer.from([...rodata].map((b) => b ^ 0x5a)).toString('latin1');
    const flag = decoded.slice(decoded.indexOf('RANGE{'), decoded.indexOf('}', decoded.indexOf('RANGE{')) + 1);
    expect((await submitFlag(ctx, p, 'binary-ghost', flag, null)).correct).toBe(true);
  });

  it('hash-heist: crack the admin MD5 from the wordlist', async () => {
    const ctx = await realCtx();
    const p = await createGuest(ctx);
    await solveCalibration(ctx, p);

    const hashes = (await download(ctx, p, 'hash-heist', 'hashes.txt')).trim().split('\n');
    const wordlist = (await download(ctx, p, 'hash-heist', 'wordlist.txt')).trim().split('\n');
    const adminHash = hashes.find((l) => l.startsWith('nebula_admin:'))!.split(':')[1];
    let cracked = '';
    for (const w of wordlist) {
      if (crypto.createHash('md5').update(w).digest('hex') === adminHash) { cracked = w; break; }
    }
    expect(cracked).toBe('nightshade77');
    expect((await submitFlag(ctx, p, 'hash-heist', `RANGE{cracked_nebula_admin_${cracked}}`, null)).correct).toBe(true);
  });

  it('buried-signal: carve the appended ZIP out of the PNG', async () => {
    const ctx = await realCtx();
    const p = await createGuest(ctx);
    await solveCalibration(ctx, p);

    const png = await downloadBytes(ctx, p, 'buried-signal', 'evidence.png');
    expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a'); // PNG signature
    const zipAt = png.indexOf(Buffer.from([0x50, 0x4b, 0x03, 0x04])); // PK\x03\x04
    expect(zipAt).toBeGreaterThan(0);
    const nameLen = png.readUInt16LE(zipAt + 26);
    const size = png.readUInt32LE(zipAt + 22);
    const dataStart = zipAt + 30 + nameLen;
    const flag = png.toString('utf8', dataStart, dataStart + size).trim();
    expect((await submitFlag(ctx, p, 'buried-signal', flag, null)).correct).toBe(true);
  });

  it('ghost-in-the-wire: XOR decrypt from the text disassembly', async () => {
    const ctx = await realCtx();
    const p = await createGuest(ctx);
    await solveCalibration(ctx, p);
    await submitFlag(ctx, p, 'rsa-paper', 'RANGE{textbook_rsa_no_padding_9d2a}', null);

    const disasm = await download(ctx, p, 'ghost-in-the-wire', 'disassembly.txt');
    const keyByte = 0x5a;
    const rodata = disasm.split('section .rodata:')[1].split('; Total:')[0];
    const encryptedBytes = [...rodata.matchAll(/0x([0-9a-f]{2})/g)].map((m) => parseInt(m[1], 16));
    const flag = encryptedBytes.map((b) => String.fromCharCode(b ^ keyByte)).join('');
    expect(flag).toMatch(/^RANGE\{/);
    expect((await submitFlag(ctx, p, 'ghost-in-the-wire', flag, null)).correct).toBe(true);
  });
});
