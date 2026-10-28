'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/client/api';
import { useSession } from '@/components/SessionProvider';
import { cn } from '@/lib/utils';

export default function AuthPage() {
  const router = useRouter();
  const { player, competition, refresh } = useSession();
  const [mode, setMode] = useState<'login' | 'register'>(player?.isGuest ? 'register' : 'login');
  const [handle, setHandle] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api(mode === 'login' ? '/api/auth/login' : '/api/auth/register', { method: 'POST', body: { handle, password } });
      await refresh();
      router.push('/dashboard');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md space-y-4">
      <div role="tablist" className="grid grid-cols-2 gap-1 rounded-lg border border-ink-700 bg-ink-900 p-1">
        {(['login', 'register'] as const).map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={mode === m}
            onClick={() => {
              setMode(m);
              setError('');
            }}
            className={cn('rounded-md py-2 text-sm', mode === m ? 'bg-ink-700 text-ink-100' : 'text-ink-400 hover:text-ink-100')}
          >
            {m === 'login' ? 'Sign in' : 'Register'}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="panel space-y-4 p-5">
        {mode === 'register' && player?.isGuest && (
          <p className="rounded border border-signal/40 bg-signal/5 p-3 text-xs text-ink-300">
            You are a guest. Registering upgrades <span className="font-mono text-ink-100">{player.handle}</span> in place, so your solves and hint unlocks are kept.
          </p>
        )}
        {mode === 'register' && competition?.allowRegistration === false && <p className="text-sm text-bad">Registration is closed.</p>}
        <div className="space-y-1.5">
          <label htmlFor="handle" className="label">
            Handle
          </label>
          <input id="handle" className="input" value={handle} onChange={(e) => setHandle(e.target.value)} autoComplete="username" required maxLength={24} />
          {mode === 'register' && <p className="text-xs text-ink-400">3-24 characters: letters, digits, _ . -</p>}
        </div>
        <div className="space-y-1.5">
          <label htmlFor="password" className="label">
            Password
          </label>
          <input
            id="password"
            type="password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            required
            minLength={mode === 'register' ? 10 : undefined}
            maxLength={128}
          />
          {mode === 'register' && <p className="text-xs text-ink-400">At least 10 characters. No email needed.</p>}
        </div>
        <p role="alert" className="min-h-5 text-sm text-bad">
          {error}
        </p>
        <button className="btn btn-primary w-full" disabled={busy}>
          {busy ? 'Working…' : mode === 'login' ? 'Sign in' : 'Create account'}
        </button>
      </form>
    </div>
  );
}
