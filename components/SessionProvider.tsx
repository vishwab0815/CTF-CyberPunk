'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, type CompetitionInfo, type PlayerInfo } from '@/lib/client/api';

interface SessionState {
  loading: boolean;
  player: PlayerInfo | null;
  competition: CompetitionInfo | null;
  flagFormat: string;
  refresh: () => Promise<void>;
  startGuest: () => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [player, setPlayer] = useState<PlayerInfo | null>(null);
  const [competition, setCompetition] = useState<CompetitionInfo | null>(null);
  const [flagFormat, setFlagFormat] = useState('RANGE{...}');

  const refresh = useCallback(async () => {
    try {
      const d = await api<{ player: PlayerInfo | null; competition: CompetitionInfo; flagFormat: string }>('/api/session');
      setPlayer(d.player);
      setCompetition(d.competition);
      setFlagFormat(d.flagFormat);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const startGuest = useCallback(async () => {
    await api('/api/session', { method: 'POST', body: {} });
    await refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    await api('/api/session', { method: 'DELETE', body: {} });
    await refresh();
  }, [refresh]);

  const value = useMemo(() => ({ loading, player, competition, flagFormat, refresh, startGuest, logout }), [loading, player, competition, flagFormat, refresh, startGuest, logout]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession(): SessionState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSession must be used inside SessionProvider');
  return v;
}
