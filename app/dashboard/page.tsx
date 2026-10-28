'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, CATEGORY_LABELS, fmtTime, type PlayerInfo } from '@/lib/client/api';
import { useSession } from '@/components/SessionProvider';

interface Me {
  player: PlayerInfo;
  progress: {
    score: number;
    rank: number | null;
    hintsSpent: number;
    solved: { id: string; title: string; category: string; solvedAt: number; value: number }[];
    byCategory: { category: string; solved: number; total: number }[];
  };
}

export default function Dashboard() {
  const { player, loading, competition, startGuest } = useSession();
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    if (player) api<Me>('/api/me').then(setMe);
  }, [player]);

  if (loading) return null;
  if (!player) {
    return (
      <div className="panel mx-auto max-w-md p-6 text-center">
        <p className="mb-4 text-ink-300">No active session.</p>
        <button className="btn btn-primary" onClick={startGuest}>
          Enter as guest
        </button>
      </div>
    );
  }
  const p = me?.progress;
  const totalSolved = p?.byCategory.reduce((a, c) => a + c.solved, 0) ?? 0;
  const total = p?.byCategory.reduce((a, c) => a + c.total, 0) ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="label text-signal">Operator console</p>
          <h1 className="text-2xl font-semibold text-ink-100">{player.handle}</h1>
        </div>
        <Link href="/challenges" className="btn btn-primary">
          Open operations board
        </Link>
      </div>

      {player.isGuest && (
        <div className="panel border-signal/40 p-4 text-sm text-ink-300">
          You are playing as a <strong className="text-ink-100">guest</strong>. Progress is tied to this browser.{' '}
          <Link href="/auth" className="text-signal underline">
            Register
          </Link>{' '}
          to keep it, sign in elsewhere, and appear on the scoreboard under your own handle. Your solves carry over.
        </div>
      )}

      {competition && competition.phase !== 'open' && (
        <div className="panel border-bad/40 p-4 text-sm text-bad">
          {competition.phase === 'not_started' ? `The competition starts ${competition.startsAt ? fmtTime(competition.startsAt) : 'soon'}.` : 'The competition has ended. Submissions are closed.'}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-4">
        {[
          ['Score', p?.score ?? '-'],
          ['Rank', p?.rank ? `#${p.rank}` : '-'],
          ['Solved', p ? `${totalSolved}/${total}` : '-'],
          ['Hints spent', p ? `-${p.hintsSpent}` : '-'],
        ].map(([k, v]) => (
          <div key={k as string} className="panel p-4">
            <p className="label">{k}</p>
            <p className="mt-1 font-mono text-3xl text-ink-100">{v}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="panel">
          <div className="panel-head">Coverage by discipline</div>
          <ul className="space-y-3 p-4">
            {(p?.byCategory ?? []).map((c) => (
              <li key={c.category}>
                <div className="mb-1 flex justify-between text-xs">
                  <Link href={`/challenges?category=${c.category}`} className="text-ink-200 hover:text-signal">
                    {CATEGORY_LABELS[c.category] ?? c.category}
                  </Link>
                  <span className="font-mono text-ink-400">
                    {c.solved}/{c.total}
                  </span>
                </div>
                <div className="h-1.5 rounded bg-ink-700" role="progressbar" aria-valuemin={0} aria-valuemax={c.total} aria-valuenow={c.solved}>
                  <div className="h-full rounded bg-signal" style={{ width: `${c.total ? (c.solved / c.total) * 100 : 0}%` }} />
                </div>
              </li>
            ))}
            {p && p.byCategory.length === 0 && <li className="text-sm text-ink-400">No operations loaded.</li>}
          </ul>
        </section>

        <section className="panel">
          <div className="panel-head">Activity log</div>
          <ul className="divide-y divide-ink-700 font-mono text-xs">
            {(p?.solved ?? [])
              .slice()
              .reverse()
              .map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <span className="text-ink-300">
                    <span className="text-ok">[SOLVED]</span>{' '}
                    <Link href={`/challenges/${s.id}`} className="hover:text-signal">
                      {s.title}
                    </Link>
                  </span>
                  <span className="text-ink-400">{fmtTime(s.solvedAt)}</span>
                </li>
              ))}
            {p && p.solved.length === 0 && <li className="px-4 py-6 text-ink-400">No solves yet. Pick an operation.</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}
