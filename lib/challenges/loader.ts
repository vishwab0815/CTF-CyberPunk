import fs from 'node:fs';
import path from 'node:path';
import { packSchema, type ChallengeDef } from './types';

export interface PackLoadResult {
  challenges: ChallengeDef[];
  errors: { dir: string; message: string }[];
}

const MAX_JSON_BYTES = 256 * 1024;

/** Reads every `<dir>/<pack>/challenge.json`. Invalid packs are reported and skipped, never fatal. */
export function loadPacks(root: string): PackLoadResult {
  const out: PackLoadResult = { challenges: [], errors: [] };
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(root, { withFileTypes: true });
  } catch {
    return out;
  }
  const seen = new Set<string>();
  for (const ent of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (!ent.isDirectory() || ent.name.startsWith('.') || ent.name.startsWith('_')) continue;
    const dir = path.join(root, ent.name);
    const jsonPath = path.join(dir, 'challenge.json');
    try {
      const stat = fs.statSync(jsonPath);
      if (stat.size > MAX_JSON_BYTES) throw new Error('challenge.json is too large');
      const parsed = packSchema.parse(JSON.parse(fs.readFileSync(jsonPath, 'utf8')));
      if (seen.has(parsed.id)) throw new Error(`duplicate challenge id "${parsed.id}"`);
      for (const a of parsed.artifacts) {
        const p = path.join(dir, 'files', a.file);
        if (!fs.statSync(p).isFile()) throw new Error(`artifact "${a.file}" is not a file`);
      }
      seen.add(parsed.id);
      out.challenges.push({
        id: parsed.id,
        title: parsed.title,
        category: parsed.category,
        difficulty: parsed.difficulty,
        points: parsed.points,
        tags: parsed.tags,
        mission: parsed.mission,
        summary: parsed.summary,
        briefing: parsed.briefing,
        objectives: parsed.objectives,
        tools: parsed.tools,
        hints: parsed.hints,
        requires: parsed.requires,
        flag:
          parsed.flag.type === 'static'
            ? { type: 'static', digest: parsed.flag.sha256, keyed: false }
            : { type: 'dynamic', tag: parsed.flag.tag },
        artifacts: parsed.artifacts,
        maxAttempts: parsed.maxAttempts,
        source: 'pack',
        dir,
        enabled: true,
      });
    } catch (err) {
      out.errors.push({ dir, message: err instanceof Error ? err.message : String(err) });
    }
  }
  return out;
}
