import { z } from 'zod';

export const CATEGORIES = {
  network: { label: 'Network Recon', blurb: 'Service discovery, protocol analysis and traffic inspection.' },
  web: { label: 'Web & API', blurb: 'Attack-surface mapping and application weaknesses.' },
  osint: { label: 'OSINT', blurb: 'Correlating public, synthetic evidence.' },
  linux: { label: 'Linux Systems', blurb: 'Permissions, services and host-level investigation.' },
  forensics: { label: 'DFIR', blurb: 'Logs, captures and artifacts.' },
  crypto: { label: 'Crypto', blurb: 'Implementation and protocol weaknesses.' },
  reversing: { label: 'Reversing', blurb: 'Analysis of executables and file formats.' },
  cloud: { label: 'Cloud & DevSecOps', blurb: 'Containers, pipelines and supply chain.' },
  enterprise: { label: 'Enterprise / AD', blurb: 'Directory services and authentication.' },
  hunting: { label: 'Threat Hunting', blurb: 'Multi-domain chains and capstones.' },
} as const;

export type CategoryId = keyof typeof CATEGORIES;
export const CATEGORY_IDS = Object.keys(CATEGORIES) as [CategoryId, ...CategoryId[]];

export const DIFFICULTIES = ['beginner', 'intermediate', 'advanced', 'expert'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const challengeIdSchema = z.string().regex(/^[a-z0-9][a-z0-9-]{1,48}$/, 'id must be 2-49 chars of a-z, 0-9, "-"');
export const artifactFileSchema = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/, 'unsafe artifact filename');

const hintSchema = z.object({
  title: z.string().min(1).max(80),
  text: z.string().min(1).max(2000),
  cost: z.number().int().min(0).max(1000),
});

/** challenge.json as authored in a pack directory. */
export const packSchema = z.object({
  id: challengeIdSchema,
  title: z.string().min(3).max(80),
  category: z.enum(CATEGORY_IDS),
  difficulty: z.enum(DIFFICULTIES),
  points: z.number().int().min(10).max(5000),
  tags: z.array(z.string().min(1).max(24)).max(8).default([]),
  mission: z.string().max(60).optional(),
  summary: z.string().min(1).max(200),
  briefing: z.string().min(1).max(8000),
  objectives: z.array(z.string().max(300)).max(12).default([]),
  tools: z.array(z.string().max(40)).max(16).default([]),
  hints: z.array(hintSchema).max(6).default([]),
  requires: z.array(challengeIdSchema).max(8).default([]),
  flag: z.discriminatedUnion('type', [
    /** sha256 hex of the exact flag. Same flag for every player. */
    z.object({ type: z.literal('static'), sha256: z.string().regex(/^[a-f0-9]{64}$/) }),
    /** Per-player flag derived with the server's HMAC secret. Embed `{{FLAG}}` in a template artifact. */
    z.object({ type: z.literal('dynamic'), tag: z.string().regex(/^[A-Za-z0-9_]{1,24}$/) }),
  ]),
  artifacts: z
    .array(
      z.object({
        file: artifactFileSchema,
        description: z.string().max(200).default(''),
        /** Substitute {{FLAG}} and {{HANDLE}} when serving. Text files only. */
        template: z.boolean().default(false),
      }),
    )
    .max(20)
    .default([]),
  maxAttempts: z.number().int().min(1).max(10_000).optional(),
});

export type PackDef = z.infer<typeof packSchema>;

export type FlagSpec =
  | { type: 'static'; digest: string; keyed: boolean }
  | { type: 'dynamic'; tag: string };

/** A challenge ready for the engine, from a pack or from the admin panel. */
export interface ChallengeDef {
  id: string;
  title: string;
  category: CategoryId;
  difficulty: Difficulty;
  points: number;
  tags: string[];
  mission?: string;
  summary: string;
  briefing: string;
  objectives: string[];
  tools: string[];
  hints: { title: string; text: string; cost: number }[];
  requires: string[];
  flag: FlagSpec;
  artifacts: { file: string; description: string; template: boolean }[];
  maxAttempts?: number;
  source: 'pack' | 'custom';
  /** Absolute path of the pack directory (packs only). */
  dir?: string;
  /** Admin override: false hides the challenge from players. */
  enabled: boolean;
}
