'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, fmtTime } from '@/lib/client/api';
import { useSession } from '@/components/SessionProvider';
import { cn } from '@/lib/utils';

interface Settings {
  startsAt: number | null;
  endsAt: number | null;
  freezeAt: number | null;
  scoringMode: 'static' | 'dynamic';
  dynamicDecay: number;
  dynamicMinRatio: number;
  allowGuests: boolean;
  allowRegistration: boolean;
  scoreboardIncludeGuests: boolean;
}
interface AdminChallenge {
  id: string;
  title: string;
  category: string;
  difficulty: string;
  points: number;
  enabled: boolean;
  source: 'pack' | 'custom';
  flagType: string;
  maxAttempts: number | null;
  requires: string[];
  solves: number;
}
interface AdminPlayer {
  id: string;
  handle: string;
  isGuest: boolean;
  isAdmin: boolean;
  isBanned: boolean;
  flagged: boolean;
  solves: number;
  attempts: number;
  lastSeenAt: number;
}
interface EventRow {
  id: number;
  ts: number;
  type: string;
  severity: 'info' | 'warn' | 'alert';
  player_id: string | null;
  ip: string | null;
  detail: string | null;
}
interface Overview {
  counts: Record<string, number>;
  settings: Settings;
  challenges: AdminChallenge[];
  packErrors: { dir: string; message: string }[];
  players: AdminPlayer[];
  events: EventRow[];
}

const TABS = ['overview', 'challenges', 'players', 'logs'] as const;
type Tab = (typeof TABS)[number];

const toLocal = (ms: number | null) => (ms ? new Date(ms - new Date(ms).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '');
const fromLocal = (v: string) => (v ? new Date(v).getTime() : null);

export default function AdminPage() {
  const { player, loading } = useSession();
  const [tab, setTab] = useState<Tab>('overview');
  const [data, setData] = useState<Overview | null>(null);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    try {
      setData(await api<Overview>('/api/admin/overview'));
    } catch (e) {
      setMsg((e as Error).message);
    }
  }, []);
  useEffect(() => {
    if (player?.isAdmin) void load();
  }, [player, load]);

  const act = async (fn: () => Promise<unknown>, confirmText?: string) => {
    if (confirmText && !confirm(confirmText)) return;
    try {
      await fn();
      setMsg('Done.');
      await load();
    } catch (e) {
      setMsg((e as Error).message);
    }
  };

  if (loading) return null;
  if (!player?.isAdmin) return <p className="text-ink-300">Administrator access required. Sign in with an admin account.</p>;
  if (!data) return <p className="font-mono text-sm text-ink-400">{msg || 'loading…'}</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="label text-signal">Range control</p>
          <h1 className="text-2xl font-semibold text-ink-100">Administration</h1>
        </div>
        <p role="status" className="font-mono text-xs text-ink-300">
          {msg}
        </p>
      </div>

      <div role="tablist" className="flex gap-1 border-b border-ink-700">
        {TABS.map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={cn('px-4 py-2 text-sm capitalize', tab === t ? 'border-b-2 border-signal text-ink-100' : 'text-ink-400 hover:text-ink-100')}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'overview' && <OverviewTab data={data} act={act} />}
      {tab === 'challenges' && <ChallengesTab data={data} act={act} />}
      {tab === 'players' && <PlayersTab data={data} act={act} />}
      {tab === 'logs' && <LogsTab />}
    </div>
  );
}

type Act = (fn: () => Promise<unknown>, confirmText?: string) => Promise<void>;

function OverviewTab({ data, act }: { data: Overview; act: Act }) {
  const [s, setS] = useState(data.settings);
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {Object.entries(data.counts).map(([k, v]) => (
          <div key={k} className="panel p-4">
            <p className="label">{k}</p>
            <p className={cn('mt-1 font-mono text-2xl', k === 'alerts' && v > 0 ? 'text-bad' : 'text-ink-100')}>{v}</p>
          </div>
        ))}
      </div>

      <section className="panel">
        <div className="panel-head">Competition settings</div>
        <form
          className="grid gap-4 p-5 md:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault();
            void act(() => api('/api/admin/settings', { method: 'PATCH', body: s }));
          }}
        >
          {(
            [
              ['Starts at', 'startsAt'],
              ['Ends at', 'endsAt'],
              ['Freeze scoreboard at', 'freezeAt'],
            ] as const
          ).map(([label, key]) => (
            <label key={key} className="space-y-1.5">
              <span className="label">{label}</span>
              <input type="datetime-local" className="input" value={toLocal(s[key])} onChange={(e) => setS({ ...s, [key]: fromLocal(e.target.value) })} />
            </label>
          ))}
          <label className="space-y-1.5">
            <span className="label">Scoring</span>
            <select className="input" value={s.scoringMode} onChange={(e) => setS({ ...s, scoringMode: e.target.value as Settings['scoringMode'] })}>
              <option value="static">Static points</option>
              <option value="dynamic">Dynamic (decays with solves)</option>
            </select>
          </label>
          <label className="space-y-1.5">
            <span className="label">Decay solves</span>
            <input type="number" min={1} className="input" value={s.dynamicDecay} onChange={(e) => setS({ ...s, dynamicDecay: Number(e.target.value) })} />
          </label>
          <label className="space-y-1.5">
            <span className="label">Min value ratio</span>
            <input type="number" min={0.05} max={1} step={0.05} className="input" value={s.dynamicMinRatio} onChange={(e) => setS({ ...s, dynamicMinRatio: Number(e.target.value) })} />
          </label>
          {(
            [
              ['Allow guests', 'allowGuests'],
              ['Allow registration', 'allowRegistration'],
              ['Guests on scoreboard', 'scoreboardIncludeGuests'],
            ] as const
          ).map(([label, key]) => (
            <label key={key} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={s[key]} onChange={(e) => setS({ ...s, [key]: e.target.checked })} />
              {label}
            </label>
          ))}
          <div className="md:col-span-3">
            <button className="btn btn-primary">Save settings</button>
          </div>
        </form>
      </section>
    </div>
  );
}

function ChallengesTab({ data, act }: { data: Overview; act: Act }) {
  const [form, setForm] = useState({ id: '', title: '', category: 'web', difficulty: 'beginner', points: 100, summary: '', briefing: '', flag: '' });
  return (
    <div className="space-y-6">
      {data.packErrors.length > 0 && (
        <div className="panel border-bad/40 p-4">
          <p className="label mb-2 text-bad">Pack load errors (these folders were skipped)</p>
          <ul className="space-y-1 font-mono text-xs text-ink-300">
            {data.packErrors.map((e) => (
              <li key={e.dir}>
                {e.dir}: {e.message}
              </li>
            ))}
          </ul>
        </div>
      )}
      <section className="panel overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-700 text-left">
              {['Challenge', 'Source', 'Flag', 'Points', 'Solves', 'Enabled', ''].map((h) => (
                <th key={h} className="label px-3 py-2.5 font-normal">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.challenges.map((c) => (
              <tr key={c.id} className="border-b border-ink-800">
                <td className="px-3 py-2">
                  <div className="text-ink-100">{c.title}</div>
                  <div className="font-mono text-[11px] text-ink-400">
                    {c.id} · {c.category} · {c.difficulty}
                    {c.requires.length > 0 && ` · needs ${c.requires.join(', ')}`}
                  </div>
                </td>
                <td className="px-3 py-2 font-mono text-xs">{c.source}</td>
                <td className="px-3 py-2 font-mono text-xs">{c.flagType}</td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    className="input w-24 py-1"
                    defaultValue={c.points}
                    min={10}
                    max={5000}
                    aria-label={`Points for ${c.title}`}
                    onBlur={(e) => Number(e.target.value) !== c.points && act(() => api(`/api/admin/challenges/${c.id}`, { method: 'PATCH', body: { points: Number(e.target.value) } }))}
                  />
                </td>
                <td className="px-3 py-2 font-mono">{c.solves}</td>
                <td className="px-3 py-2">
                  <input type="checkbox" checked={c.enabled} aria-label={`Enable ${c.title}`} onChange={(e) => act(() => api(`/api/admin/challenges/${c.id}`, { method: 'PATCH', body: { enabled: e.target.checked } }))} />
                </td>
                <td className="space-x-2 whitespace-nowrap px-3 py-2 text-right">
                  <button className="btn btn-sm btn-danger" onClick={() => act(() => api(`/api/admin/challenges/${c.id}`, { method: 'POST', body: { action: 'reset' } }), `Reset ALL progress on "${c.title}"? This clears every player's solves, attempts and hints for it.`)}>
                    Reset
                  </button>
                  {c.source === 'custom' && (
                    <button className="btn btn-sm btn-danger" onClick={() => act(() => api(`/api/admin/challenges/${c.id}`, { method: 'DELETE', body: {} }), `Delete "${c.title}"?`)}>
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {data.challenges.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-ink-400">
                  No challenges. Add packs to the challenges/ folder or create one below.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="panel">
        <div className="panel-head">Quick-create a challenge (static flag, no files)</div>
        <form
          className="grid gap-4 p-5 md:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            void act(() => api('/api/admin/challenges', { method: 'POST', body: form }));
          }}
        >
          {(
            [
              ['id', 'Id (a-z, 0-9, -)'],
              ['title', 'Title'],
              ['summary', 'One-line summary'],
              ['flag', 'Flag (stored keyed-hashed)'],
            ] as const
          ).map(([k, label]) => (
            <label key={k} className="space-y-1.5">
              <span className="label">{label}</span>
              <input className="input" value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} required />
            </label>
          ))}
          <label className="space-y-1.5">
            <span className="label">Category</span>
            <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {['network', 'web', 'osint', 'linux', 'forensics', 'crypto', 'reversing', 'cloud', 'enterprise', 'hunting'].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5">
            <span className="label">Difficulty / points</span>
            <div className="flex gap-2">
              <select className="input" value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })}>
                {['beginner', 'intermediate', 'advanced', 'expert'].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              <input type="number" className="input w-28" min={10} value={form.points} onChange={(e) => setForm({ ...form, points: Number(e.target.value) })} />
            </div>
          </label>
          <label className="space-y-1.5 md:col-span-2">
            <span className="label">Briefing</span>
            <textarea className="input min-h-28" value={form.briefing} onChange={(e) => setForm({ ...form, briefing: e.target.value })} required />
          </label>
          <div>
            <button className="btn btn-primary">Create</button>
          </div>
        </form>
      </section>
    </div>
  );
}

function PlayersTab({ data, act }: { data: Overview; act: Act }) {
  const post = (id: string, action: string) => () => api(`/api/admin/players/${id}`, { method: 'POST', body: { action } });
  return (
    <section className="panel overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-ink-700 text-left">
            {['Handle', 'Type', 'Solves', 'Attempts', 'Last seen', 'Status', ''].map((h) => (
              <th key={h} className="label px-3 py-2.5 font-normal">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.players.map((p) => (
            <tr key={p.id} className="border-b border-ink-800">
              <td className="px-3 py-2 font-mono text-ink-100">{p.handle}</td>
              <td className="px-3 py-2 font-mono text-xs">{p.isAdmin ? 'admin' : p.isGuest ? 'guest' : 'registered'}</td>
              <td className="px-3 py-2 font-mono">{p.solves}</td>
              <td className="px-3 py-2 font-mono">{p.attempts}</td>
              <td className="px-3 py-2 font-mono text-xs text-ink-400">{fmtTime(p.lastSeenAt)}</td>
              <td className="px-3 py-2">
                {p.isBanned && <span className="chip border-bad/50 text-bad">banned</span>} {p.flagged && <span className="chip border-signal/50 text-signal">flagged</span>}
              </td>
              <td className="space-x-2 whitespace-nowrap px-3 py-2 text-right">
                {!p.isAdmin && (
                  <>
                    <button className="btn btn-sm" onClick={() => act(post(p.id, p.isBanned ? 'unban' : 'ban'))}>
                      {p.isBanned ? 'Unban' : 'Ban'}
                    </button>
                    <button className="btn btn-sm" onClick={() => act(post(p.id, 'reset'), `Reset all progress for ${p.handle}?`)}>
                      Reset
                    </button>
                    <button className="btn btn-sm btn-danger" onClick={() => act(post(p.id, 'delete'), `Permanently delete ${p.handle}?`)}>
                      Delete
                    </button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function LogsTab() {
  const [severity, setSeverity] = useState('');
  const [events, setEvents] = useState<EventRow[]>([]);
  const [subs, setSubs] = useState<{ id: number; ts: number; challenge: string; correct: number; submitted: string; handle: string; ip: string | null }[]>([]);
  useEffect(() => {
    api<{ events: EventRow[]; submissions: typeof subs }>(`/api/admin/logs${severity ? `?severity=${severity}` : ''}`).then((d) => {
      setEvents(d.events);
      setSubs(d.submissions);
    });
  }, [severity]);
  const color = { info: 'text-ink-300', warn: 'text-signal', alert: 'text-bad' } as const;
  return (
    <div className="space-y-6">
      <section className="panel">
        <div className="panel-head">
          <span>Event log</span>
          <select className="input w-auto py-1" value={severity} onChange={(e) => setSeverity(e.target.value)} aria-label="Severity filter">
            <option value="">all</option>
            <option value="warn">warn</option>
            <option value="alert">alert</option>
          </select>
        </div>
        <ul className="max-h-96 divide-y divide-ink-800 overflow-auto font-mono text-xs">
          {events.map((e) => (
            <li key={e.id} className="flex gap-3 px-4 py-2">
              <span className="shrink-0 text-ink-400">{fmtTime(e.ts)}</span>
              <span className={cn('w-12 shrink-0 uppercase', color[e.severity])}>{e.severity}</span>
              <span className="text-ink-100">{e.type}</span>
              <span className="truncate text-ink-400">{e.detail}</span>
            </li>
          ))}
        </ul>
      </section>
      <section className="panel">
        <div className="panel-head">Recent submissions</div>
        <ul className="max-h-96 divide-y divide-ink-800 overflow-auto font-mono text-xs">
          {subs.map((s) => (
            <li key={s.id} className="flex gap-3 px-4 py-2">
              <span className="shrink-0 text-ink-400">{fmtTime(s.ts)}</span>
              <span className={s.correct ? 'text-ok' : 'text-bad'}>{s.correct ? 'OK ' : 'BAD'}</span>
              <span className="text-ink-100">{s.handle}</span>
              <span className="text-ink-300">{s.challenge}</span>
              <span className="truncate text-ink-400">{s.correct ? '' : s.submitted}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
