'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';

export default function Timer() {
  const { data: session } = useSession();
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    if (!session?.user) return;

    // Don't run timer for admin users
    if (session.user.isAdmin) return;

    // Fetch initial timer state
    const fetchTimer = async () => {
      try {
        const res = await fetch('/api/timer');
        if (res.ok) {
          const data = await res.json();
          setTime(Math.floor(data.totalTime / 1000));
          setIsRunning(data.isRunning);

          // Start timer if not already started
          if (!data.isRunning && !data.startTime) {
            await fetch('/api/timer', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'start' }),
            });
            setIsRunning(true);
          }
        }
      } catch (error) {
        console.error('Failed to fetch timer:', error);
      }
    };

    fetchTimer();
  }, [session]);

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setTime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Don't render timer for non-authenticated or admin users
  if (!session?.user || session.user.isAdmin) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed top-4 right-4 z-50 bg-[hsl(220,26%,10%)]/90 backdrop-blur-xl border border-cyan-500/30 rounded-xl px-6 py-3 shadow-2xl"
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
          <span className="text-xs text-cyan-400/70 font-medium">TIME</span>
        </div>
        <div className="text-xl font-bold font-mono text-cyan-300">
          {formatTime(time)}
        </div>
      </div>
      <div className="mt-1 text-xs text-cyan-400/50 text-center">
        {session.user.teamName}
      </div>
    </motion.div>
  );
}
