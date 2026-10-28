import crypto from 'node:crypto';
import { MongoClient, type Db as MongoDb, type Collection, type ObjectId } from 'mongodb';
import { loadConfig, type AppConfig } from './config';

/**
 * Everything a service needs: the Mongo database handle, parsed config and the
 * flag secret. Services take this explicitly so tests can run against a throwaway
 * in-memory MongoDB with a unique database name.
 */
export interface Ctx {
  db: MongoDb;
  client: MongoClient;
  config: AppConfig;
  secret: Buffer;
}

// ---- Document shapes (snake_case mirrors the previous relational columns) ----
export interface PlayerDoc {
  _id: string; // same as id
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
export interface SessionDoc {
  _id: string; // token hash
  player_id: string;
  created_at: number;
  expires_at: number;
  ip: string | null;
  user_agent: string | null;
}
export interface SolveDoc {
  _id: string; // `${player_id}:${challenge_id}`
  player_id: string;
  challenge_id: string;
  solved_at: number;
}
export interface SubmissionDoc {
  _id?: ObjectId;
  player_id: string;
  challenge_id: string;
  correct: number;
  submitted: string;
  ip: string | null;
  created_at: number;
}
export interface HintUnlockDoc {
  _id: string; // `${player_id}:${challenge_id}:${hint_index}`
  player_id: string;
  challenge_id: string;
  hint_index: number;
  cost: number;
  unlocked_at: number;
}
export interface IssuedFlagDoc {
  _id: string; // `${challenge_id}:${player_id}`
  challenge_id: string;
  player_id: string;
  digest: string;
  issued_at: number;
}
export interface EventDoc {
  _id?: ObjectId;
  ts: number;
  type: string;
  severity: string;
  player_id: string | null;
  ip: string | null;
  detail: string | null;
}
export interface RateLimitDoc {
  _id: string; // key
  window_start: number;
  count: number;
}
export interface SettingDoc {
  _id: string; // key, or '__flag_secret'
  key?: string;
  value: string;
}
export interface OverrideDoc {
  _id: string; // challenge_id
  challenge_id: string;
  enabled: number | null;
  points: number | null;
  max_attempts: number | null;
  updated_at: number;
}
export interface CustomChallengeDoc {
  _id: string; // id
  id: string;
  title: string;
  category: string;
  difficulty: string;
  points: number;
  summary: string;
  briefing: string;
  flag_digest: string;
  hints: string;
  requires: string;
  tags: string;
  created_at: number;
  updated_at: number;
}

export interface Collections {
  players: Collection<PlayerDoc>;
  sessions: Collection<SessionDoc>;
  solves: Collection<SolveDoc>;
  submissions: Collection<SubmissionDoc>;
  hint_unlocks: Collection<HintUnlockDoc>;
  issued_flags: Collection<IssuedFlagDoc>;
  events: Collection<EventDoc>;
  rate_limits: Collection<RateLimitDoc>;
  settings: Collection<SettingDoc>;
  challenge_overrides: Collection<OverrideDoc>;
  custom_challenges: Collection<CustomChallengeDoc>;
}

/** Typed collection accessor. */
export function cols(ctx: Ctx): Collections {
  const db = ctx.db;
  return {
    players: db.collection<PlayerDoc>('players'),
    sessions: db.collection<SessionDoc>('sessions'),
    solves: db.collection<SolveDoc>('solves'),
    submissions: db.collection<SubmissionDoc>('submissions'),
    hint_unlocks: db.collection<HintUnlockDoc>('hint_unlocks'),
    issued_flags: db.collection<IssuedFlagDoc>('issued_flags'),
    events: db.collection<EventDoc>('events'),
    rate_limits: db.collection<RateLimitDoc>('rate_limits'),
    settings: db.collection<SettingDoc>('settings'),
    challenge_overrides: db.collection<OverrideDoc>('challenge_overrides'),
    custom_challenges: db.collection<CustomChallengeDoc>('custom_challenges'),
  };
}

const indexed = new Set<string>();

async function ensureIndexes(db: MongoDb): Promise<void> {
  const key = `${db.databaseName}`;
  if (indexed.has(key)) return;
  indexed.add(key);
  await Promise.all([
    db.collection('players').createIndex({ handle_lower: 1 }, { unique: true }),
    db.collection('sessions').createIndex({ player_id: 1 }),
    db.collection('sessions').createIndex({ expires_at: 1 }),
    db.collection('solves').createIndex({ challenge_id: 1, solved_at: 1 }),
    db.collection('solves').createIndex({ player_id: 1 }),
    db.collection('submissions').createIndex({ player_id: 1, challenge_id: 1 }),
    db.collection('submissions').createIndex({ created_at: 1 }),
    db.collection('hint_unlocks').createIndex({ player_id: 1 }),
    db.collection('issued_flags').createIndex({ digest: 1 }),
    db.collection('events').createIndex({ ts: -1 }),
    db.collection('events').createIndex({ severity: 1 }),
  ]);
}

// Cache the connected client across invocations (important for serverless reuse).
declare global {
  var __rangeMongo: Promise<MongoClient> | undefined;
}

async function getClient(uri: string): Promise<MongoClient> {
  if (!globalThis.__rangeMongo) {
    globalThis.__rangeMongo = new MongoClient(uri, { maxPoolSize: 10 }).connect();
  }
  return globalThis.__rangeMongo;
}

/**
 * Resolves the HMAC secret behind per-player flags. FLAG_SECRET wins; otherwise a
 * random secret is generated once and persisted in the settings collection, so it
 * is stable across serverless instances without any local disk.
 */
async function resolveSecret(db: MongoDb, config: AppConfig): Promise<Buffer> {
  if (config.flagSecret) {
    if (config.flagSecret.length < 32) throw new Error('FLAG_SECRET must be at least 32 characters');
    return Buffer.from(config.flagSecret, 'utf8');
  }
  const settings = db.collection<SettingDoc>('settings');
  const existing = await settings.findOne({ _id: '__flag_secret' });
  if (existing?.value) return Buffer.from(existing.value, 'hex');
  const secret = crypto.randomBytes(32);
  await settings.updateOne(
    { _id: '__flag_secret' },
    { $setOnInsert: { value: secret.toString('hex') } },
    { upsert: true },
  );
  const row = await settings.findOne({ _id: '__flag_secret' });
  return Buffer.from(row!.value, 'hex');
}

export async function createCtx(config: AppConfig = loadConfig(), secret?: Buffer): Promise<Ctx> {
  if (!config.mongoUri) throw new Error('MONGODB_URI is not set. Point it at your MongoDB connection string.');
  const client = await getClient(config.mongoUri);
  const db = client.db(config.mongoDb);
  await ensureIndexes(db);
  return { db, client, config, secret: secret ?? (await resolveSecret(db, config)) };
}
