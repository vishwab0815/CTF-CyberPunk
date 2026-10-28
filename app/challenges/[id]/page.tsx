'use client';

import Link from 'next/link';
import { use, useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Download, KeyRound, Lightbulb, Wrench, CheckCircle2, XCircle } from 'lucide-react';
import { api, ApiError, CATEGORY_LABELS, DIFFICULTY_STYLE, type ChallengeDetail } from '@/lib/client/api';
import { useSession } from '@/components/SessionProvider';
import { cn } from '@/lib/utils';

interface Result {
  ok: boolean;
  text: string;
}

export default function ChallengePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { player, loading, competition } = useSession();
  const [c, setC] = useState<ChallengeDetail | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [flag, setFlag] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const load = useCallback(async () => {
    try {
      setC((await api<{ challenge: ChallengeDetail }>(`/api/challenges/${id}`)).challenge);
      setError(null);
    } catch (e) {
      setError(e as ApiError);
    }
  }, [id]);

  useEffect(() => {
    if (player) void load();
  }, [player, load]);

  if (loading) return null;
  if (!player) return <p className="text-ink-300">Start a session first from the top bar.</p>;
  if (error) {
    return (
      <div className="panel mx-auto max-w-lg p-6">
        <p className="mb-4 text-ink-200">{error.message}</p>
        <Link href="/challenges" className="btn">
          <ArrowLeft className="size-4" aria-hidden /> Back to board
        </Link>
      </div>
    );
  }
  if (!c) return <p className="font-mono text-sm text-ink-400">loading…</p>;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setResult(null);
    try {
      const r = await api<{ correct: boolean; alreadySolved: boolean; message: string; value?: number; attemptsLeft?: number }>(`/api/challenges/${id}/submit`, { method: 'POST', body: { flag } });
      setResult(r.correct ? { ok: true, text: r.alreadySolved ? 'Already solved.' : `Flag accepted. +${r.value} pts` } : { ok: false, text: `Incorrect flag. ${r.attemptsLeft ?? '?'} attempts left.` });
      if (r.correct) {
        setFlag('');
        await load();
      } else {
        setC((cur) => (cur ? { ...cur, attemptsUsed: cur.attemptsUsed + 1 } : cur));
      }
    } catch (err) {
      setResult({ ok: false, text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const unlock = async (index: number, cost: number) => {
    if (cost > 0 && !confirm(`Unlock this hint for -${cost} points?`)) return;
    try {
      await api(`/api/challenges/${id}/hints/${index}`, { method: 'POST', body: {} });
      await load();
    } catch (err) {
      setResult({ ok: false, text: (err as Error).message });
    }
  };

  const closed = competition?.phase !== 'open' && !player.isAdmin;

  return (
    <div className="space-y-6">
      <Link href="/challenges" className="inline-flex items-center gap-1.5 text-sm text-ink-400 hover:text-ink-100">
        <ArrowLeft className="size-3.5" aria-hidden /> Operations
      </Link>

      <header className="space-y-3">
        {c.mission && <p className="label text-signal">{c.mission}</p>}
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold text-ink-100">{c.title}</h1>
          {c.solved && (
            <span className="chip border-ok/50 text-ok">
              <CheckCircle2 className="mr-1 size-3" aria-hidden /> solved
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="chip border-ink-600 text-ink-300">{CATEGORY_LABELS[c.category] ?? c.category}</span>
          <span className={cn('chip', DIFFICULTY_STYLE[c.difficulty])}>{c.difficulty}</span>
          {c.tags.map((t) => (
            <span key={t} className="chip border-ink-700 text-ink-400">
              {t}
            </span>
          ))}
          <span className="ml-auto font-mono text-sm text-signal">{c.value} pts</span>
          <span className="font-mono text-xs text-ink-400">{c.solves} solves</span>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <section className="panel">
            <div className="panel-head">Briefing</div>
            <div className="space-y-4 p-5 text-[15px] leading-7 text-ink-200">
              {c.briefing.split(/\n{2,}/).map((p, i) => (
                <p key={i} className="whitespace-pre-wrap">
                  {p}
                </p>
              ))}
            </div>
          </section>

          {c.objectives.length > 0 && (
            <section className="panel">
              <div className="panel-head">Objectives</div>
              <ul className="space-y-2 p-5 text-sm text-ink-200">
                {c.objectives.map((o, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="font-mono text-signal">{String(i + 1).padStart(2, '0')}</span>
                    {o}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="panel">
            <div className="panel-head">
              <span>
                <Lightbulb className="mr-1.5 inline size-3.5" aria-hidden />
                Hints
              </span>
              <span>spend points to unlock</span>
            </div>
            {c.hints.length === 0 ? (
              <p className="p-5 text-sm text-ink-400">No hints for this operation.</p>
            ) : (
              <ul className="divide-y divide-ink-700">
                {c.hints.map((h) => (
                  <li key={h.index} className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-ink-100">{h.title}</span>
                      {!h.unlocked && (
                        <button className="btn btn-sm" onClick={() => unlock(h.index, h.cost)} disabled={closed}>
                          Unlock (-{h.cost})
                        </button>
                      )}
                    </div>
                    {h.text && <p className="mt-2 whitespace-pre-wrap rounded border border-ink-700 bg-ink-950 p-3 font-mono text-[13px] text-ink-200">{h.text}</p>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <section className="panel">
            <div className="panel-head">Submit flag</div>
            <form onSubmit={submit} className="space-y-3 p-4">
              <label htmlFor="flag" className="label">
                Format: {c.flagFormat}
              </label>
              <div className="flex items-center gap-2 rounded-md border border-ink-600 bg-ink-950 px-3 focus-within:border-signal">
                <KeyRound className="size-4 text-ink-400" aria-hidden />
                <input
                  id="flag"
                  className="w-full bg-transparent py-2 font-mono text-sm text-ink-100 outline-none placeholder:text-ink-400"
                  value={flag}
                  onChange={(e) => setFlag(e.target.value)}
                  placeholder={c.flagFormat}
                  autoComplete="off"
                  spellCheck={false}
                  maxLength={256}
                  disabled={c.solved || closed}
                />
              </div>
              <button className="btn btn-primary w-full" disabled={busy || !flag.trim() || c.solved || closed}>
                {c.solved ? 'Solved' : busy ? 'Verifying…' : 'Submit'}
              </button>
              {closed && <p className="text-xs text-ink-400">Submissions are closed ({competition?.phase === 'ended' ? 'competition ended' : 'not started'}).</p>}
              <p role="status" aria-live="polite" className={cn('flex items-center gap-1.5 text-sm', result?.ok ? 'text-ok' : 'text-bad')}>
                {result && (result.ok ? <CheckCircle2 className="size-4" aria-hidden /> : <XCircle className="size-4" aria-hidden />)}
                {result?.text}
              </p>
              <p className="font-mono text-[11px] text-ink-400">
                attempts used {c.attemptsUsed}/{c.maxAttempts}
              </p>
            </form>
          </section>

          <section className="panel">
            <div className="panel-head">
              <span>
                <Download className="mr-1.5 inline size-3.5" aria-hidden />
                Evidence
              </span>
            </div>
            {c.artifacts.length === 0 ? (
              <p className="p-4 text-sm text-ink-400">No downloadable files.</p>
            ) : (
              <ul className="divide-y divide-ink-700">
                {c.artifacts.map((a) => (
                  <li key={a.file} className="p-3">
                    <a className="flex items-center gap-2 font-mono text-sm text-info hover:underline" href={`/api/challenges/${c.id}/files/${encodeURIComponent(a.file)}`} download>
                      <Download className="size-3.5" aria-hidden />
                      {a.file}
                    </a>
                    {a.description && <p className="mt-1 text-xs text-ink-400">{a.description}</p>}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {c.tools.length > 0 && (
            <section className="panel">
              <div className="panel-head">
                <span>
                  <Wrench className="mr-1.5 inline size-3.5" aria-hidden />
                  Suggested toolkit
                </span>
              </div>
              <div className="flex flex-wrap gap-2 p-4">
                {c.tools.map((t) => (
                  <span key={t} className="chip border-ink-600 text-ink-200">
                    {t}
                  </span>
                ))}
              </div>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
