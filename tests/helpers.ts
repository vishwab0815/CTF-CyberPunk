import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createCtx, type Ctx } from '../lib/server/db';
import { loadConfig } from '../lib/server/config';
import { createGuest, type Player } from '../lib/server/players';
import { clearPackCache } from '../lib/server/registry';
import { sha256Hex } from '../lib/server/crypto';
import crypto from 'node:crypto';
import { testMongoUri } from './mongo';

export interface TestPack {
  id: string;
  points?: number;
  requires?: string[];
  flag?: { type: 'static'; plain: string } | { type: 'dynamic'; tag: string };
  hints?: { title: string; text: string; cost: number }[];
  maxAttempts?: number;
  artifacts?: { file: string; content: string; template?: boolean }[];
}

export function makePacks(packs: TestPack[]): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'range-packs-'));
  for (const p of packs) {
    const dir = path.join(root, p.id);
    fs.mkdirSync(path.join(dir, 'files'), { recursive: true });
    const flag = p.flag ?? { type: 'dynamic' as const, tag: 'test' };
    for (const a of p.artifacts ?? []) fs.writeFileSync(path.join(dir, 'files', a.file), a.content);
    fs.writeFileSync(
      path.join(dir, 'challenge.json'),
      JSON.stringify({
        id: p.id,
        title: `Challenge ${p.id}`,
        category: 'crypto',
        difficulty: 'beginner',
        points: p.points ?? 100,
        summary: 'test',
        briefing: 'test briefing',
        requires: p.requires ?? [],
        hints: p.hints ?? [],
        maxAttempts: p.maxAttempts,
        flag: flag.type === 'static' ? { type: 'static', sha256: sha256Hex(flag.plain) } : flag,
        artifacts: (p.artifacts ?? []).map((a) => ({ file: a.file, template: !!a.template })),
      }),
    );
  }
  return root;
}

export async function testCtx(packs: TestPack[] = [], env: Record<string, string> = {}): Promise<Ctx> {
  clearPackCache();
  const uri = await testMongoUri();
  const config = loadConfig({ MONGODB_URI: uri, MONGODB_DB: `t_${crypto.randomBytes(6).toString('hex')}`, CHALLENGES_DIR: makePacks(packs), NODE_ENV: 'test', ...env });
  return createCtx(config);
}

export function guest(ctx: Ctx): Promise<Player> {
  return createGuest(ctx);
}
