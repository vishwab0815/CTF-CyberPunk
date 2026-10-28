'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Lock, Users } from 'lucide-react';
import { api, CATEGORY_LABELS, DIFFICULTY_STYLE, type CatalogEntry } from '@/lib/client/api';
import { useSession } from '@/components/SessionProvider';
import { cn } from '@/lib/utils';

function Select({ value, onChange, options, label }: { value: string; onChange: (v: string) => void; options: [string, string][]; label: string }) {
  return (
    <label className="flex items-center gap-2">
      <span className="label">{label}</span>
      <select className="input w-auto py-1.5" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}

function Catalog() {
  const params = useSearchParams();
  const { player, loading, startGuest } = useSession();
  const [items, setItems] = useState<CatalogEntry[] | null>(null);
  const [category, setCategory] = useState(params.get('category') ?? 'all');
  const [difficulty, setDifficulty] = useState('all');
  const [status, setStatus] = useState('all');
  const [q, setQ] = useState('');

  useEffect(() => {
    if (!player) return;
    api<{ challenges: CatalogEntry[] }>('/api/challenges').then((d) => setItems(d.challenges));
  }, [player]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (items ?? []).filter(
      (c) =>
        (category === 'all' || c.category === category) &&
        (difficulty === 'all' || c.difficulty === difficulty) &&
        (status === 'all' || (status === 'solved' ? c.solved : status === 'open' ? !c.solved && !c.locked : c.locked)) &&
        (!needle || `${c.title} ${c.summary} ${c.tags.join(' ')}`.toLowerCase().includes(needle)),
    );
  }, [items, category, difficulty, status, q]);

  const groups = useMemo(() => {
    const m = new Map<string, CatalogEntry[]>();
    for (const c of filtered) {
      const key = c.mission ?? 'Standalone operations';
      m.set(key, [...(m.get(key) ?? []), c]);
    }
    return [...m.entries()];
  }, [filtered]);

  if (loading) return null;
  if (!player) {
    return (
      <div className="panel mx-auto max-w-md p-6 text-center">
        <p className="mb-4 text-ink-300">Start a session to view the operations board.</p>
        <button className="btn btn-primary" onClick={startGuest}>
          Enter as guest
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink-100">Operations board</h1>
        <p className="text-sm text-ink-400">Locked operations show what they unlock behind. Solve their prerequisites to read the full brief.</p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <input className="input max-w-56" placeholder="Search…" aria-label="Search operations" value={q} onChange={(e) => setQ(e.target.value)} />
        <Select label="Discipline" value={category} onChange={setCategory} options={[['all', 'All'], ...Object.entries(CATEGORY_LABELS)]} />
        <Select label="Level" value={difficulty} onChange={setDifficulty} options={[['all', 'All'], ['beginner', 'Beginner'], ['intermediate', 'Intermediate'], ['advanced', 'Advanced'], ['expert', 'Expert']]} />
        <Select label="Status" value={status} onChange={setStatus} options={[['all', 'All'], ['open', 'Available'], ['solved', 'Solved'], ['locked', 'Locked']]} />
      </div>

      {items === null ? (
        <p className="font-mono text-sm text-ink-400">loading…</p>
      ) : filtered.length === 0 ? (
        <div className="panel p-8 text-center text-ink-400">{items.length === 0 ? 'No operations are loaded yet. Organisers: add challenge packs to the challenges/ folder.' : 'Nothing matches those filters.'}</div>
      ) : (
        groups.map(([mission, list]) => (
          <section key={mission} aria-label={mission}>
            <h2 className="label mb-3">{mission}</h2>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {list.map((c) => (
                <Link
                  key={c.id}
                  href={`/challenges/${c.id}`}
                  className={cn('panel flex flex-col gap-3 p-4 transition hover:border-signal/50', c.solved && 'border-ok/40 bg-ok/[0.04]', c.locked && 'opacity-70')}
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-medium text-ink-100">{c.title}</h3>
                    {c.solved ? <CheckCircle2 className="size-4 shrink-0 text-ok" aria-label="Solved" /> : c.locked ? <Lock className="size-4 shrink-0 text-ink-400" aria-label="Locked" /> : null}
                  </div>
                  <p className="line-clamp-2 text-sm text-ink-400">{c.summary}</p>
                  <div className="mt-auto flex flex-wrap items-center gap-2">
                    <span className="chip border-ink-600 text-ink-300">{CATEGORY_LABELS[c.category] ?? c.category}</span>
                    <span className={cn('chip', DIFFICULTY_STYLE[c.difficulty])}>{c.difficulty}</span>
                    <span className="ml-auto flex items-center gap-3 font-mono text-xs text-ink-300">
                      <span className="flex items-center gap-1" title="Solves">
                        <Users className="size-3" aria-hidden />
                        {c.solves}
                      </span>
                      <span className="text-signal">{c.value} pts</span>
                    </span>
                  </div>
                  {c.locked && <p className="font-mono text-[11px] text-ink-400">needs: {c.requires.filter((r) => !r.solved).map((r) => r.title).join(', ')}</p>}
                </Link>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

export default function Page() {
  return (
    <Suspense>
      <Catalog />
    </Suspense>
  );
}
