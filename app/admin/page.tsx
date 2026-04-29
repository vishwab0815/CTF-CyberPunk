"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { BadgeCheck, Clock3, RefreshCw, Search, ShieldAlert, Users } from 'lucide-react';
import LEVEL_META, { getDisplayLevel } from '../../lib/levelMeta';
import { Button } from '../../components/ui/button';

type Tab = 'leaderboard' | 'monitoring';

interface LeaderboardEntry {
  rank: number;
  teamName: string;
  email: string;
  completedLevels: string[];
  completedCount: number;
  completionPercentage: number;
  totalTime: number;
  isComplete: boolean;
}

interface Submission {
  id: string;
  teamName: string;
  email: string;
  level: string;
  legacyLevel?: string;
  flag: string;
  isCorrect: boolean;
  attemptNumber: number;
  timeTaken: number;
  createdAt: string;
}

interface LevelStats {
  level: string;
  totalAttempts: number;
  successfulAttempts: number;
  uniqueUsers: number;
  successRate: number;
}

const LEVEL_FILTERS = ['all', '1', '2', '3', '4', '5', '6', '7'] as const;

const getLevelLabel = (level: string) => {
  if (level === 'all') return 'All Levels';
  const meta = LEVEL_META[level as keyof typeof LEVEL_META];
  const displayLevel = getDisplayLevel(level);
  return meta && displayLevel ? `Level ${displayLevel} - ${meta.shortTitle}` : `Level ${level}`;
};

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('leaderboard');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [stats, setStats] = useState<LevelStats[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [totalTeams, setTotalTeams] = useState<number>(0);
  const [totalSubmissions, setTotalSubmissions] = useState<number>(0);

  const fetchData = useCallback(async () => {
    try {
      if (activeTab === 'leaderboard') {
        const res = await fetch('/api/admin/leaderboard');
        const data = await res.json();
        setLeaderboard(data.leaderboard || []);
        setTotalTeams(data.totalUsers || 0);
      } else {
        const url = selectedLevel === 'all'
          ? '/api/admin/submissions'
          : `/api/admin/submissions?level=${selectedLevel}`;
        const res = await fetch(url);
        const data = await res.json();
        setSubmissions(data.submissions || []);
        setStats(data.stats || []);
        setTotalSubmissions(data.totalSubmissions || 0);
      }
      setLastUpdated(new Date().toLocaleString());
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setIsLoading(false);
    }
  }, [activeTab, selectedLevel]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && !session?.user?.isAdmin) {
      router.push('/levels/1');
    }
  }, [status, session, router]);

  useEffect(() => {
    if (session?.user?.isAdmin) {
      void fetchData();
    }
  }, [session, fetchData]);

  useEffect(() => {
    if (!autoRefresh || !session?.user?.isAdmin) return;

    const interval = setInterval(fetchData, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, [autoRefresh, session, fetchData]);

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const filteredLeaderboard = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return leaderboard;
    return leaderboard.filter((entry) =>
      [entry.teamName, entry.email, entry.completedCount.toString(), entry.isComplete ? 'complete' : 'in progress']
        .join(' ')
        .toLowerCase()
        .includes(query)
    );
  }, [leaderboard, searchQuery]);

  const filteredSubmissions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return submissions;
    return submissions.filter((sub) =>
      [sub.teamName, sub.email, sub.level, sub.legacyLevel || '', sub.flag, sub.isCorrect ? 'correct' : 'wrong']
        .join(' ')
        .toLowerCase()
        .includes(query)
    );
  }, [submissions, searchQuery]);

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-[hsl(220,26%,6%)] flex items-center justify-center">
        <div className="text-cyan-400 text-xl">Loading...</div>
      </div>
    );
  }

  if (!session?.user?.isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[hsl(220,26%,6%)] text-cyan-100 p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-4xl font-bold mb-2 bg-linear-to-r from-cyan-400 via-purple-400 to-green-400 bg-clip-text text-transparent">
          Admin Dashboard
        </h1>
        <p className="text-cyan-400/70">Real-time CTF monitoring and leaderboard</p>
      </motion.div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="rounded-2xl border border-cyan-500/20 bg-[hsl(220,26%,10%)] p-4 shadow-lg shadow-cyan-500/5">
          <div className="flex items-center justify-between text-cyan-400 text-sm mb-2">
            <span>Ranked Teams</span>
            <Users className="w-4 h-4" />
          </div>
          <div className="text-3xl font-bold text-cyan-300">{totalTeams}</div>
        </div>
        <div className="rounded-2xl border border-purple-500/20 bg-[hsl(220,26%,10%)] p-4 shadow-lg shadow-purple-500/5">
          <div className="flex items-center justify-between text-purple-400 text-sm mb-2">
            <span>Submissions</span>
            <BadgeCheck className="w-4 h-4" />
          </div>
          <div className="text-3xl font-bold text-cyan-300">{totalSubmissions}</div>
        </div>
        <div className="rounded-2xl border border-green-500/20 bg-[hsl(220,26%,10%)] p-4 shadow-lg shadow-green-500/5">
          <div className="flex items-center justify-between text-green-400 text-sm mb-2">
            <span>Live Refresh</span>
            <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
          </div>
          <div className="text-lg font-semibold text-cyan-300">{autoRefresh ? 'Every 5s' : 'Paused'}</div>
        </div>
        <div className="rounded-2xl border border-yellow-500/20 bg-[hsl(220,26%,10%)] p-4 shadow-lg shadow-yellow-500/5">
          <div className="flex items-center justify-between text-yellow-400 text-sm mb-2">
            <span>Last Updated</span>
            <Clock3 className="w-4 h-4" />
          </div>
          <div className="text-sm font-medium text-cyan-300">{lastUpdated || 'Waiting for data'}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`px-6 py-3 rounded-lg font-semibold transition-all ${
            activeTab === 'leaderboard'
              ? 'bg-cyan-500 text-white'
              : 'bg-[hsl(220,26%,10%)] text-cyan-400 hover:bg-[hsl(220,26%,15%)]'
          }`}
        >
          Leaderboard
        </button>
        <button
          onClick={() => setActiveTab('monitoring')}
          className={`px-6 py-3 rounded-lg font-semibold transition-all ${
            activeTab === 'monitoring'
              ? 'bg-purple-500 text-white'
              : 'bg-[hsl(220,26%,10%)] text-cyan-400 hover:bg-[hsl(220,26%,15%)]'
          }`}
        >
          Level Monitoring
        </button>

        {/* Auto-refresh toggle */}
        <div className="ml-auto flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-5 h-5 accent-cyan-500"
            />
            <span className="text-cyan-400 text-sm">Auto-refresh (5s)</span>
          </label>
          <Button onClick={() => router.push('/')} variant="outline" size="sm">
            Home
          </Button>
        </div>
      </div>

      <div className="mb-6 flex flex-col lg:flex-row gap-4 lg:items-center">
        <div className="relative flex-1 max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400/60" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={activeTab === 'leaderboard' ? 'Search team, email, or status...' : 'Search team, flag, or level...'}
            className="w-full rounded-xl border border-cyan-500/20 bg-[hsl(220,26%,10%)] py-3 pl-10 pr-4 text-cyan-100 placeholder-cyan-800 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
          />
        </div>
        <div className="text-sm text-cyan-400/70">
          Showing {activeTab === 'leaderboard' ? filteredLeaderboard.length : filteredSubmissions.length} records
        </div>
      </div>

      {/* Content */}
      {activeTab === 'leaderboard' ? (
        <motion.div
          key="leaderboard"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-[hsl(220,26%,10%)] rounded-lg p-6 border border-cyan-500/20"
        >
          <h2 className="text-2xl font-bold mb-4 text-cyan-400">Leaderboard</h2>

          {filteredLeaderboard.length === 0 ? (
            <p className="text-cyan-400/50 text-center py-8">No ranked teams yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-cyan-500/30">
                    <th className="text-left py-3 px-4 text-cyan-400">Rank</th>
                    <th className="text-left py-3 px-4 text-cyan-400">Team Name</th>
                    <th className="text-left py-3 px-4 text-cyan-400">Email</th>
                    <th className="text-left py-3 px-4 text-cyan-400">Completed</th>
                    <th className="text-left py-3 px-4 text-cyan-400">Progress</th>
                    <th className="text-left py-3 px-4 text-cyan-400">Time</th>
                    <th className="text-left py-3 px-4 text-cyan-400">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeaderboard.map((entry) => (
                    <tr
                      key={entry.rank}
                      className="border-b border-cyan-500/10 hover:bg-[hsl(220,26%,12%)] transition-colors"
                    >
                      <td className="py-3 px-4">
                        <span className={`font-bold ${
                          entry.rank === 1 ? 'text-yellow-400 text-xl' :
                          entry.rank === 2 ? 'text-gray-300 text-lg' :
                          entry.rank === 3 ? 'text-orange-400 text-lg' :
                          'text-cyan-400'
                        }`}>
                          #{entry.rank}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-cyan-300">
                        {entry.teamName}
                      </td>
                      <td className="py-3 px-4 text-cyan-400/70">{entry.email}</td>
                      <td className="py-3 px-4">
                        <span className="text-green-400 font-mono">
                          {entry.completedCount}/7
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="w-full bg-[hsl(220,26%,15%)] rounded-full h-2">
                          <div
                            className="bg-linear-to-r from-cyan-500 to-green-500 h-2 rounded-full transition-all"
                            style={{ width: `${entry.completionPercentage}%` }}
                          />
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-cyan-300">
                        {formatTime(entry.totalTime)}
                      </td>
                      <td className="py-3 px-4">
                        {entry.isComplete ? (
                          <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-semibold">
                            Complete
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-sm font-semibold">
                            In Progress
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      ) : (
        <motion.div
          key="monitoring"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {/* Level Filter */}
          <div className="mb-6 flex gap-2 flex-wrap">
            {LEVEL_FILTERS.map((level) => (
              <button
                key={level}
                onClick={() => setSelectedLevel(level)}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  selectedLevel === level
                    ? 'bg-purple-500 text-white'
                    : 'bg-[hsl(220,26%,10%)] text-cyan-400 hover:bg-[hsl(220,26%,15%)]'
                }`}
              >
                {getLevelLabel(level)}
              </button>
            ))}
          </div>

          {/* Statistics */}
          {stats.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              {stats.map((stat) => (
                <div
                  key={stat.level}
                  className="bg-[hsl(220,26%,10%)] rounded-lg p-4 border border-purple-500/20"
                >
                  <div className="text-purple-400 text-sm mb-2">{getLevelLabel(stat.level)}</div>
                  <div className="text-2xl font-bold text-cyan-300 mb-1">
                    {stat.successfulAttempts}/{stat.totalAttempts}
                  </div>
                  <div className="text-xs text-cyan-400/70">
                    {stat.successRate.toFixed(1)}% success rate
                  </div>
                  <div className="text-xs text-cyan-400/50 mt-1">
                    {stat.uniqueUsers} unique users
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Submissions */}
          <div className="bg-[hsl(220,26%,10%)] rounded-lg p-6 border border-purple-500/20">
            <h2 className="text-2xl font-bold mb-4 text-purple-400">
              Recent Submissions
            </h2>

            {filteredSubmissions.length === 0 ? (
              <p className="text-cyan-400/50 text-center py-8">No submissions yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-purple-500/30">
                      <th className="text-left py-3 px-4 text-purple-400">Timestamp</th>
                      <th className="text-left py-3 px-4 text-purple-400">Team</th>
                      <th className="text-left py-3 px-4 text-purple-400">Level</th>
                      <th className="text-left py-3 px-4 text-purple-400">Flag</th>
                      <th className="text-left py-3 px-4 text-purple-400">Attempt</th>
                      <th className="text-left py-3 px-4 text-purple-400">Time</th>
                      <th className="text-left py-3 px-4 text-purple-400">Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSubmissions.map((sub) => (
                      <tr
                        key={sub.id}
                        className="border-b border-purple-500/10 hover:bg-[hsl(220,26%,12%)] transition-colors"
                      >
                        <td className="py-3 px-4 text-cyan-400/70 font-mono text-xs">
                          {formatTimestamp(sub.createdAt)}
                        </td>
                        <td className="py-3 px-4 text-cyan-300">{sub.teamName}</td>
                        <td className="py-3 px-4 font-mono text-purple-300">
                          {getLevelLabel(sub.level)}
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-cyan-400/70 max-w-xs truncate">
                          {sub.flag}
                        </td>
                        <td className="py-3 px-4 text-cyan-400/70">
                          #{sub.attemptNumber}
                        </td>
                        <td className="py-3 px-4 font-mono text-cyan-300">
                          {formatTime(sub.timeTaken)}
                        </td>
                        <td className="py-3 px-4">
                          {sub.isCorrect ? (
                            <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-semibold">
                              ✓ Correct
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-semibold">
                              ✗ Wrong
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
