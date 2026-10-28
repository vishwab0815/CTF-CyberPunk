'use client';

import { useEffect, useMemo, useState } from 'react';
import { Snowflake } from 'lucide-react';
import { api } from '@/lib/client/api';

interface Entry {
  rank: number;
  handle: string;
  isGuest: boolean;
  score: number;
  solves: number;
  lastSolveAt: number | null;
  timeline?: { t: number; score: number }[];
}
interface Board {
  frozen: boolean;
  total: number;
  entries: Entry[];
  me: number | null;
}

const COLORS = ['#ffb224', '#3ddc97', '#5aa9ff', '#a58bff', '#ff5d6c', '#ffd98a', '#7ee0c0', '#9cc9ff', '#c9b9ff', '#ff9aa4'];

function Chart({ entries }: { entries: Entry[] }) {
  const series = entries.filter((e) => e.timeline && e.timeline.length).slice(0, 10);
  const { tMin, tMax, sMax } = useMemo(() => {
    const ts = series.flatMap((s) => s.timeline!.map((p) => p.t));
    const ss = series.flatMap((s) => s.timeline!.map((p) => p.score));
    return { tMin: Math.min(...ts), tMax: Math.max(...ts, Math.min(...ts) + 1), sMax: Math.max(...ss, 1) };
  }, [series]);
  if (series.length === 0) return <p className="p-6 text-sm text-ink-400">No solves yet.</p>;
  const W = 800;
  const H = 220;
  const x = (t: number) => 30 + ((t - tMin) / (tMax - tMin || 1)) * (W - 40);
  const y = (s: number) => H - 20 - (s / sMax) * (H - 40);
  return (
    <div className="p-4">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Score progression of the top players">
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line x1="30" x2={W - 10} y1={y(sMax * f)} y2={y(sMax * f)} stroke="#1c2633" />
            <text x="2" y={y(sMax * f) + 4} fontSize="10" fill="#6b7a90" fontFamily="monospace">
              {Math.round(sMax * f)}
            </text>
          </g>
        ))}
        {series.map((s, i) => {
          const pts = [{ t: tMin, score: 0 }, ...s.timeline!];
          const d = pts.map((p, j) => `${j ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p.score).toFixed(1)}`).join(' ');
          return <path key={s.handle} d={d} fill="none" stroke={COLORS[i % COLORS.length]} strokeWidth="2" strokeLinejoin="round" />;
        })}
      </svg>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-ink-300">
        {series.map((s, i) => (
          <li key={s.handle} className="flex items-center gap-1.5">
            <i className="inline-block size-2 rounded-sm" style={{ background: COLORS[i % COLORS.length] }} />
            {s.handle}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function ScoreboardPage() {
  const [board, setBoard] = useState<Board | null>(null);

  useEffect(() => {
    const load = () => api<Board>('/api/scoreboard').then(setBoard).catch(() => {});
    void load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="label text-signal">Live standings</p>
          <h1 className="text-2xl font-semibold text-ink-100">Scoreboard</h1>
        </div>
        {board?.frozen && (
          <span className="chip border-info/50 text-info">
            <Snowflake className="mr-1 size-3" aria-hidden /> frozen
          </span>
        )}
      </div>

      <section className="panel">
        <div className="panel-head">Top 10 progression</div>
        {board ? <Chart entries={board.entries} /> : null}
      </section>

      <section className="panel overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">Player standings</caption>
          <thead>
            <tr className="border-b border-ink-700 text-left">
              {['#', 'Operator', 'Solves', 'Score'].map((h, i) => (
                <th key={h} className={`label px-4 py-2.5 font-normal ${i >= 2 ? 'text-right' : ''}`} scope="col">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(board?.entries ?? []).map((e) => (
              <tr key={e.rank} className={`border-b border-ink-800 ${board?.me === e.rank ? 'bg-signal/[0.07]' : ''}`}>
                <td className="px-4 py-2 font-mono text-ink-400">{e.rank}</td>
                <td className="px-4 py-2 font-mono text-ink-100">
                  {e.handle}
                  {e.isGuest && <span className="chip ml-2 border-ink-600 text-ink-400">guest</span>}
                </td>
                <td className="px-4 py-2 text-right font-mono text-ink-300">{e.solves}</td>
                <td className="px-4 py-2 text-right font-mono text-signal">{e.score}</td>
              </tr>
            ))}
            {board && board.entries.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-ink-400">
                  No scores yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
