'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowRight, Radar, Globe, Search, Terminal, Binary, Lock, Cloud, Network, Building2, Crosshair } from 'lucide-react';
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
    <div className="space-y-16">
      <section className="grid gap-10 pt-6 lg:grid-cols-[1.15fr_1fr] lg:items-center">
        <div className="space-y-6">
          <p className="label text-signal">Cyber operations competition</p>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-ink-100 md:text-6xl">
            Think like the attacker.
            <br />
            <span className="text-signal">Prove it with evidence.</span>
          </h1>
          <p className="max-w-xl text-lg text-ink-300">
            A hands-on range for ethical hackers. Every operation ships with real artifacts to analyse using the tools you already know from Kali Linux. Every operator gets
            their own flags, so the only way forward is the work.
          </p>
          <div className="flex flex-wrap gap-3">
            {competition?.allowGuests === false && !player ? (
              <Link href="/auth" className="btn btn-primary">
                Register to enter <ArrowRight className="size-4" aria-hidden />
              </Link>
            ) : (
              <button className="btn btn-primary" onClick={enter}>
                {player ? 'Open console' : 'Enter as guest'} <ArrowRight className="size-4" aria-hidden />
              </button>
            )}
            <Link href="/challenges" className="btn">
              Browse operations
            </Link>
            <Link href="/scoreboard" className="btn">
              Scoreboard
            </Link>
          </div>
          <dl className="grid max-w-md grid-cols-3 gap-4 pt-2">
            {[
              ['Operations', stats?.challenges],
              ['Operators', stats?.players],
              ['Solves', stats?.solves],
            ].map(([k, v]) => (
              <div key={k as string} className="border-l border-ink-600 pl-3">
                <dt className="label">{k}</dt>
                <dd className="font-mono text-2xl text-ink-100">{v ?? '-'}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="panel overflow-hidden shadow-[0_0_80px_-30px] shadow-signal/30">
          <div className="panel-head">
            <span>range://controller</span>
            <span className="flex gap-1.5" aria-hidden>
              <i className="size-2 rounded-full bg-bad/70" />
              <i className="size-2 rounded-full bg-signal/70" />
              <i className="size-2 rounded-full bg-ok/70" />
            </span>
          </div>
          <pre className="min-h-56 whitespace-pre-wrap p-4 font-mono text-[13px] leading-7 text-ink-300" aria-label="Boot log">
            {BOOT.slice(0, line).map((l, i) => (
              <span key={i} className={l.startsWith('[ ok ]') ? 'block text-ok/90' : 'block text-signal'}>
                {l}
              </span>
            ))}
            <span className="caret block text-ink-100">$ </span>
          </pre>
        </div>
      </section>

      <section aria-labelledby="disciplines">
        <h2 id="disciplines" className="label mb-4">
          Disciplines
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {(stats?.categories ?? []).map((c) => {
            const Icon = ICONS[c.id] ?? Crosshair;
            return (
              <Link key={c.id} href={`/challenges?category=${c.id}`} className="panel group p-4 transition hover:border-signal/50">
                <Icon className="mb-3 size-5 text-signal" />
                <h3 className="text-sm font-medium text-ink-100">{c.label}</h3>
                <p className="mt-1 text-xs text-ink-400">{c.blurb}</p>
                <p className="mt-3 font-mono text-[11px] text-ink-300">{c.challenges} ops</p>
              </Link>
            );
          })}
        </div>
      </section>

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
