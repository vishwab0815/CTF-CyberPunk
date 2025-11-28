'use client';

import { useEffect, useState, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { User, LogOut, KeyRound, ChevronDown } from 'lucide-react';

export default function Timer() {
  const { data: session } = useSession();
  const router = useRouter();
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/auth/signin' });
  };

  const handleChangePassword = () => {
    setIsMenuOpen(false);
    router.push('/auth/change-password');
  };

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
      ref={menuRef}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed top-4 right-4 z-50"
    >
      <div className="bg-[hsl(220,26%,10%)]/90 backdrop-blur-xl border border-cyan-500/30 rounded-xl px-6 py-3 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
            <span className="text-xs text-cyan-400/70 font-medium">TIME</span>
          </div>
          <div className="text-xl font-bold font-mono text-cyan-300">
            {formatTime(time)}
          </div>
        </div>
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="mt-1 w-full flex items-center justify-center gap-1 text-xs text-cyan-400/70 hover:text-cyan-400 transition-colors group"
        >
          <User className="w-3 h-3" />
          <span>{session.user.teamName}</span>
          <ChevronDown className={`w-3 h-3 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full right-0 mt-2 w-56 bg-[hsl(220,26%,10%)]/95 backdrop-blur-xl border border-cyan-500/30 rounded-xl shadow-2xl overflow-hidden"
          >
            <div className="p-2 space-y-1">
              <button
                onClick={handleChangePassword}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-cyan-300 hover:bg-cyan-500/10 rounded-lg transition-all group"
              >
                <KeyRound className="w-4 h-4 text-cyan-400 group-hover:text-cyan-300" />
                <span>Change Password</span>
              </button>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-300 hover:bg-red-500/10 rounded-lg transition-all group"
              >
                <LogOut className="w-4 h-4 text-red-400 group-hover:text-red-300" />
                <span>Sign Out</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
