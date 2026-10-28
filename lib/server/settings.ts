import { z } from 'zod';
import { cols, type Ctx } from './db';

export const settingsSchema = z.object({
  /** Competition window as epoch ms; null means always open. */
  startsAt: z.number().int().nullable(),
  endsAt: z.number().int().nullable(),
  /** After this time the public scoreboard stops changing. Admins still see live scores. */
  freezeAt: z.number().int().nullable(),
  scoringMode: z.enum(['static', 'dynamic']),
  /** Dynamic scoring: solves needed to decay a challenge to its minimum value. */
  dynamicDecay: z.number().int().min(1).max(10_000),
  /** Dynamic scoring: minimum value as a fraction of the base points. */
  dynamicMinRatio: z.number().min(0.05).max(1),
  allowGuests: z.boolean(),
  allowRegistration: z.boolean(),
  scoreboardIncludeGuests: z.boolean(),
});

export type Settings = z.infer<typeof settingsSchema>;

export const DEFAULT_SETTINGS: Settings = {
  startsAt: null,
  endsAt: null,
  freezeAt: null,
  scoringMode: 'static',
  dynamicDecay: 30,
  dynamicMinRatio: 0.3,
  allowGuests: true,
  allowRegistration: true,
  scoreboardIncludeGuests: true,
};

export async function getSettings(ctx: Ctx): Promise<Settings> {
  const rows = await cols(ctx).settings.find({ key: { $exists: true } }).toArray();
  const stored: Record<string, unknown> = {};
  for (const r of rows) {
    try {
      stored[r.key!] = JSON.parse(r.value);
    } catch {
      // ignore corrupt rows; defaults apply
    }
  }
  const parsed = settingsSchema.partial().safeParse(stored);
  return { ...DEFAULT_SETTINGS, ...(parsed.success ? parsed.data : {}) };
}

export async function updateSettings(ctx: Ctx, patch: Partial<Settings>): Promise<Settings> {
  const next = settingsSchema.parse({ ...(await getSettings(ctx)), ...patch });
  const settings = cols(ctx).settings;
  await Promise.all(
    Object.entries(next).map(([k, v]) =>
      settings.updateOne({ _id: k }, { $set: { key: k, value: JSON.stringify(v) } }, { upsert: true }),
    ),
  );
  return next;
}

export type CompetitionPhase = 'open' | 'not_started' | 'ended';

export function competitionPhase(s: Settings, now = Date.now()): CompetitionPhase {
  if (s.startsAt !== null && now < s.startsAt) return 'not_started';
  if (s.endsAt !== null && now >= s.endsAt) return 'ended';
  return 'open';
}
