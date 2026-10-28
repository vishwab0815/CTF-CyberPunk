'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowRight, Radar, Globe, Search, Terminal, Binary, Lock, Cloud, Network, Building2, Crosshair, ChevronDown } from 'lucide-react';
import { api } from '@/lib/client/api';
import { useSession } from '@/components/SessionProvider';

interface Stats {
  players: number;
  solves: number;
  challenges: number;
  categories: { id: string; label: string; blurb: string; challenges: number }[];
}

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  network: Network,
  web: Globe,
  osint: Search,
  linux: Terminal,
  forensics: Radar,
  crypto: Lock,
  reversing: Binary,
  cloud: Cloud,
  enterprise: Building2,
  hunting: Crosshair,
};

const BOOT = ['[ ok ] range controller online', '[ ok ] evidence vault mounted (read-only)', '[ ok ] per-operator flag keys derived', '[ ok ] scoring engine armed', '[ -- ] awaiting operator'];
const TOOLS = ['Wireshark', 'Ghidra', 'hashcat', 'Burp', 'Volatility', 'radare2', 'binwalk', 'John'];

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
    const t = setTimeout(() => setLine((l) => l + 1), 380);
    return () => clearTimeout(t);
  }, [line]);

  const enter = async () => {
    if (!player) await startGuest();
    router.push('/dashboard');
  };

  return (
    <div className="space-y-24">
      {/* ---- HERO : fills the fold ---- */}
      <section className="relative -mt-8 flex min-h-[calc(100svh-3.5rem)] flex-col justify-center py-10">
        {/* ambient light */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute left-1/2 top-[-10%] h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(255,178,36,0.16),transparent_62%)] blur-2xl" />
          <div className="absolute bottom-[-20%] right-[-10%] h-[420px] w-[520px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(90,169,255,0.10),transparent_60%)] blur-3xl" />
        </div>

        <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:items-center">
          {/* left column */}
          <div className="space-y-7">
            <span className="inline-flex items-center gap-2 rounded-full border border-signal/30 bg-signal/10 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-signal">
              <i className="size-1.5 animate-pulse rounded-full bg-signal" aria-hidden />
              Live range · synthetic targets
            </span>

            <h1 className="text-5xl font-semibold leading-[0.98] tracking-tight text-ink-100 md:text-7xl">
              Think like the attacker.
              <br />
              <span className="bg-gradient-to-r from-signal via-[#ffd37a] to-signal bg-clip-text text-transparent">Prove it with evidence.</span>
            </h1>

            <p className="max-w-xl text-lg leading-relaxed text-ink-300">
              A hands-on range for ethical hackers. Every operation ships with real artifacts to analyse using the tools you already know from Kali Linux. Every operator gets their own
              flags, so the only way forward is the work.
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

            {/* tools strip */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
              <span className="label text-ink-500">Bring your toolkit</span>
              <div className="flex flex-wrap gap-2">
                {TOOLS.map((t) => (
                  <span key={t} className="rounded border border-ink-700 bg-ink-900/60 px-2 py-0.5 font-mono text-[11px] text-ink-300">
                    {t}
                  </span>
                ))}
              </div>
            </div>

            <dl className="grid max-w-md grid-cols-3 gap-4 pt-2">
              {[
                ['Operations', stats?.challenges],
                ['Operators', stats?.players],
                ['Solves', stats?.solves],
              ].map(([k, v]) => (
                <div key={k as string} className="border-l border-ink-600 pl-3">
                  <dt className="label">{k}</dt>
                  <dd className="font-mono text-3xl tabular-nums text-ink-100">{v ?? '—'}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* right column : terminal */}
          <div className="panel relative overflow-hidden shadow-[0_0_120px_-40px] shadow-signal/40 ring-1 ring-signal/5">
            {/* moving scanline */}
            <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-28 animate-[scan_5s_linear_infinite] bg-gradient-to-b from-signal/10 via-signal/5 to-transparent" />
            <div className="panel-head relative">
              <span>range://controller</span>
              <span className="flex gap-1.5" aria-hidden>
                <i className="size-2 rounded-full bg-bad/70" />
                <i className="size-2 rounded-full bg-signal/70" />
                <i className="size-2 rounded-full bg-ok/70" />
              </span>
            </div>
            <pre className="relative min-h-64 whitespace-pre-wrap p-5 font-mono text-[13px] leading-7 text-ink-300" aria-label="Boot log">
              {BOOT.slice(0, line).map((l, i) => (
                <span key={i} className={l.startsWith('[ ok ]') ? 'block text-ok/90' : 'block text-signal'}>
                  {l}
                </span>
              ))}
              <span className="caret block text-ink-100">$ </span>
            </pre>
          </div>
        </div>

        {/* scroll cue */}
        <div className="mt-12 hidden items-center gap-2 lg:flex">
          <ChevronDown className="size-4 animate-bounce text-signal" aria-hidden />
          <span className="label">Explore the disciplines</span>
        </div>
      </section>

      {/* ---- DISCIPLINES ---- */}
      <section aria-labelledby="disciplines">
        <div className="mb-5 flex items-end justify-between">
          <h2 id="disciplines" className="text-2xl font-semibold tracking-tight text-ink-100">
            Ten disciplines, one campaign
          </h2>
          <Link href="/challenges" className="label transition hover:text-signal">
            View all →
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {(stats?.categories ?? []).map((c) => {
            const Icon = ICONS[c.id] ?? Crosshair;
            return (
              <Link key={c.id} href={`/challenges?category=${c.id}`} className="panel group relative overflow-hidden p-4 transition hover:-translate-y-0.5 hover:border-signal/50">
                <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-br from-signal/0 to-signal/0 transition group-hover:from-signal/5" />
                <Icon className="mb-3 size-5 text-signal" />
                <h3 className="text-sm font-medium text-ink-100">{c.label}</h3>
                <p className="mt-1 text-xs text-ink-400">{c.blurb}</p>
                <p className="mt-3 font-mono text-[11px] text-ink-300">{c.challenges} ops</p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ---- HOW IT WORKS ---- */}
      <section className="grid gap-4 md:grid-cols-3" aria-label="How it works">
        {[
          ['01 / Brief', 'Open an operation to read the scenario, objectives and suggested tooling. Prerequisites unlock deeper stages.'],
          ['02 / Investigate', 'Download the evidence and work it offline with your own toolkit. Nothing here runs on, or touches, your machine.'],
          ['03 / Report', 'Submit the flag you recover. Validation is server-side and unique to you, so shared flags are detected.'],
        ].map(([t, d]) => (
          <div key={t} className="panel p-5">
            <p className="font-mono text-xs text-signal">{t}</p>
            <p className="mt-2 text-sm text-ink-300">{d}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
