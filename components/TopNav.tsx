'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Crosshair, LogOut, ShieldCheck, Trophy, LayoutDashboard, Flag, Wrench } from 'lucide-react';
import { useSession } from './SessionProvider';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

const LINKS = [
  { href: '/dashboard', label: 'Console', icon: LayoutDashboard },
  { href: '/challenges', label: 'Operations', icon: Flag },
  { href: '/scoreboard', label: 'Scoreboard', icon: Trophy },
];

function useCountdown(target: number | null | undefined): string | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!target) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [target]);
  if (!target || target <= now) return null;
  const s = Math.floor((target - now) / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export default function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { player, competition, logout, startGuest, loading } = useSession();
  const remaining = useCountdown(competition?.phase === 'open' ? competition.endsAt : competition?.startsAt);

  return (
    <header className="sticky top-0 z-40 border-b border-ink-700 bg-ink-950/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4">
        <Link href="/" className="flex items-center gap-2 font-mono text-sm font-semibold tracking-[0.2em] text-ink-100">
          <Crosshair className="size-4 text-signal" aria-hidden />
          OBSIDIAN<span className="text-signal">RANGE</span>
        </Link>

        <nav className="flex items-center gap-1" aria-label="Primary">
          {LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-ink-300 transition hover:bg-ink-800 hover:text-ink-100',
                pathname.startsWith(href) && 'bg-ink-800 text-ink-100',
              )}
            >
              <Icon className="size-3.5" aria-hidden />
              <span className="hidden sm:inline">{label}</span>
            </Link>
          ))}
          {player?.isAdmin && (
            <Link href="/admin" className={cn('flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-signal transition hover:bg-ink-800', pathname.startsWith('/admin') && 'bg-ink-800')}>
              <Wrench className="size-3.5" aria-hidden />
              <span className="hidden sm:inline">Admin</span>
            </Link>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          {remaining && (
            <span className="hidden font-mono text-xs text-ink-300 md:inline" title={competition?.phase === 'open' ? 'Time remaining' : 'Starts in'}>
              {competition?.phase === 'open' ? 'T-' : 'START '}
              <span className="text-signal">{remaining}</span>
            </span>
          )}
          {loading ? null : player ? (
            <>
              <span className="flex items-center gap-1.5 font-mono text-xs text-ink-200">
                {!player.isGuest && <ShieldCheck className="size-3.5 text-ok" aria-label="Registered" />}
                {player.handle}
                {player.isGuest && <span className="chip border-ink-600 text-ink-400">guest</span>}
              </span>
              {player.isGuest && (
                <Link href="/auth" className="btn btn-sm">
                  Save progress
                </Link>
              )}
              <button
                className="btn btn-sm"
                aria-label="Sign out"
                onClick={async () => {
                  await logout();
                  router.push('/');
                }}
              >
                <LogOut className="size-3.5" aria-hidden />
              </button>
            </>
          ) : (
            <>
              <Link href="/auth" className="btn btn-sm">
                Sign in
              </Link>
              {competition?.allowGuests !== false && (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={async () => {
                    await startGuest();
                    router.push('/dashboard');
                  }}
                >
                  Play as guest
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
}
