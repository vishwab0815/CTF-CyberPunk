'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { api } from '@/lib/client/api';
import { useSession } from '@/components/SessionProvider';

interface Stats {
  players: number;
  solves: number;
  challenges: number;
  categories: { id: string; label: string; blurb: string; challenges: number }[];
}

const BOOT = ['[ ok ] range controller online', '[ ok ] evidence vault mounted (read-only)', '[ ok ] per-operator flag keys derived', '[ ok ] scoring engine armed', '[ -- ] awaiting operator'];
const TOOLS = ['Wireshark', 'Ghidra', 'hashcat', 'Burp', 'Volatility', 'radare2', 'binwalk'];

export default function Landing() {
  const router = useRouter();
  const { player, startGuest, competition } = useSession();
  const [stats, setStats] = useState<Stats | null>(null);
  const [line, setLine] = useState(0);

  useEffect(() => {
    api<Stats>('/api/stats').then(setStats).catch(() => {});
  }, []);
  useEffect(() => {
    if (line >= BOOT.length) return;
    const t = setTimeout(() => setLine((l) => l + 1), 360);
    return () => clearTimeout(t);
  }, [line]);

  const enter = async () => {
    if (!player) await startGuest();
    router.push('/dashboard');
  };

  const stat = [
    ['Operations', stats?.challenges],
    ['Disciplines', stats?.categories.length],
    ['Operators', stats?.players],
    ['Solves', stats?.solves],
  ] as const;

  return (
    <div className="fixed inset-x-0 bottom-0 top-14 z-30 overflow-hidden">
      {/* ambient light + vignette */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-[46%] top-[-14%] h-[560px] w-[860px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(255,178,36,0.18),transparent_62%)] blur-2xl" />
        <div className="absolute bottom-[-24%] right-[-8%] h-[460px] w-[560px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(90,169,255,0.12),transparent_60%)] blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(7,9,13,0.85)_100%)]" />
      </div>

      {/* corner brackets */}
      <div aria-hidden className="pointer-events-none absolute left-5 top-5 size-7 border-l border-t border-signal/30" />
      <div aria-hidden className="pointer-events-none absolute right-5 top-5 size-7 border-r border-t border-signal/30" />
      <div aria-hidden className="pointer-events-none absolute bottom-5 left-5 size-7 border-b border-l border-signal/30" />
      <div aria-hidden className="pointer-events-none absolute bottom-5 right-5 size-7 border-b border-r border-signal/30" />

      {/* content */}
      <div className="relative mx-auto flex h-full max-w-7xl items-center px-6 md:px-10">
        <div className="grid w-full items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          {/* left */}
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-signal/30 bg-signal/10 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-signal">
              <i className="size-1.5 animate-pulse rounded-full bg-signal" aria-hidden />
              Live range · synthetic targets
            </span>

            <h1 className="font-semibold leading-[0.95] tracking-tight text-ink-100" style={{ fontSize: 'clamp(2.4rem, 5.4vw, 4.9rem)' }}>
              Think like the attacker.
              <br />
              <span className="bg-gradient-to-r from-signal via-[#ffd584] to-signal bg-clip-text text-transparent">Prove it with evidence.</span>
            </h1>

            <p className="max-w-xl text-ink-300" style={{ fontSize: 'clamp(0.95rem, 1.15vw, 1.15rem)' }}>
              A hands-on range for ethical hackers. Every operation ships with real artifacts to analyse with the tools you already know from Kali Linux — and every operator gets their own flags.
            </p>

            <div className="flex flex-wrap gap-3">
              {competition?.allowGuests === false && !player ? (
                <Link href="/auth" className="btn btn-primary group">
                  Register to enter <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </Link>
              ) : (
                <button className="btn btn-primary group" onClick={enter}>
                  {player ? 'Open console' : 'Enter as guest'} <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </button>
              )}
              <Link href="/challenges" className="btn">
                Browse operations
              </Link>
              <Link href="/scoreboard" className="btn">
                Scoreboard
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className="label text-ink-500">Toolkit</span>
              {TOOLS.map((t) => (
                <span key={t} className="font-mono text-[11px] text-ink-400">
                  {t}
                </span>
              ))}
            </div>

            <dl className="flex flex-wrap gap-x-8 gap-y-3 border-t border-ink-700/70 pt-5">
              {stat.map(([k, v]) => (
                <div key={k}>
                  <dd className="font-mono text-2xl tabular-nums text-ink-100">{v ?? '—'}</dd>
                  <dt className="label">{k}</dt>
                </div>
              ))}
            </dl>
          </div>

          {/* right : terminal */}
          <div className="hidden lg:block">
            <div className="panel relative overflow-hidden shadow-[0_0_140px_-40px] shadow-signal/40 ring-1 ring-signal/5">
              <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-28 animate-[scan_5s_linear_infinite] bg-gradient-to-b from-signal/10 via-signal/5 to-transparent" />
              <div className="panel-head relative">
                <span>range://controller</span>
                <span className="flex gap-1.5" aria-hidden>
                  <i className="size-2 rounded-full bg-bad/70" />
                  <i className="size-2 rounded-full bg-signal/70" />
                  <i className="size-2 rounded-full bg-ok/70" />
                </span>
              </div>
              <pre className="relative min-h-60 whitespace-pre-wrap p-5 font-mono text-[13px] leading-7 text-ink-300" aria-label="Boot log">
                {BOOT.slice(0, line).map((l, i) => (
                  <span key={i} className={l.startsWith('[ ok ]') ? 'block text-ok/90' : 'block text-signal'}>
                    {l}
                  </span>
                ))}
                <span className="caret block text-ink-100">$ </span>
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
