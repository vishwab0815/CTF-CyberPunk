"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useLevelAccess } from "@/lib/useLevelAccess";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Zap, Check } from "lucide-react";
import { useSession } from "next-auth/react";
import "@/app/styles/cyber-global.css";

// Error log data for Phase 3
const ERROR_LOGS = [
  { id: 1, code: 'ERR-11', color: 'red', text: 'MEMORY_LEAK_DETECTED' },
  { id: 2, code: 'ERR-28', color: 'yellow', text: 'CACHE_OVERFLOW_WARNING' },
  { id: 3, code: 'ERR-07', color: 'blue', text: 'NETWORK_TIMEOUT_ERROR' },
  { id: 4, code: 'ERR-44', color: 'red', text: 'STACK_CORRUPTION_CRITICAL' },
  { id: 5, code: 'ERR-13', color: 'green', text: 'PROCESS_SPAWN_SUCCESS' },
  { id: 6, code: 'ERR-31', color: 'red', text: 'SEGFAULT_VIOLATION_FATAL' },
  { id: 7, code: 'ERR-92', color: 'purple', text: 'THREAD_DEADLOCK_DETECTED' },
];

export default function LevelThreeOne() {
  const router = useRouter();
  const { canAccess, isChecking } = useLevelAccess('3.1');
  const { update } = useSession();

  // Phase tracking
  const [currentPhase, setCurrentPhase] = useState<number>(1);
  const [completedPhases, setCompletedPhases] = useState<number[]>([]);
  const [fragments, setFragments] = useState<string[]>([]);

  // Phase 1: Multi-click state
  const [clickCount, setClickCount] = useState<number>(0);
  const [clickTimestamp, setClickTimestamp] = useState<number>(0);
  const [phase1Hint, setPhase1Hint] = useState<boolean>(false);

  // Phase 2: Arrow key state
  const [keySequence, setKeySequence] = useState<string[]>([]);
  const [phase2Hint, setPhase2Hint] = useState<boolean>(false);
  const [phase2SpacingAlign, setPhase2SpacingAlign] = useState<boolean>(false);

  // Phase 3: Error line state
  const [selectedErrors, setSelectedErrors] = useState<number[]>([]);
  const [phase3Failed, setPhase3Failed] = useState<boolean>(false);

  // General state
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [allComplete, setAllComplete] = useState<boolean>(false);

  // Visual effects
  const [glitchIntensity, setGlitchIntensity] = useState<number>(1);
  const [scanlineOffset, setScanlineOffset] = useState<number>(0);

  // Refs
  const phase1StartTime = useRef<number>(0);
  const phase2StartTime = useRef<number>(Date.now());

  // Fetch current progress on mount
  useEffect(() => {
    fetchProgress();
  }, []);

  const fetchProgress = async () => {
    try {
      const res = await fetch('/api/levels/3.1');
      if (res.ok) {
        const data = await res.json();
        if (data.exists) {
          setCurrentPhase(data.currentPhase);
          setCompletedPhases(data.completedPhases || []);
          setAllComplete(data.allComplete || false);
        }
      }
    } catch (err) {
      console.error('Failed to fetch progress:', err);
    }
  };

  // Scanline animation
  useEffect(() => {
    const interval = setInterval(() => {
      setScanlineOffset((prev) => (prev + 2) % 100);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Phase 1 hint timer (45 seconds)
  useEffect(() => {
    if (currentPhase === 1 && !completedPhases.includes(1)) {
      const timer = setTimeout(() => {
        setPhase1Hint(true);
      }, 45000);

      return () => clearTimeout(timer);
    }
  }, [currentPhase, completedPhases]);

  // Phase 2 hint timer (60 seconds)
  useEffect(() => {
    if (currentPhase === 2 && !completedPhases.includes(2)) {
      const timer = setTimeout(() => {
        setPhase2Hint(true);
        // Flash alignment for 1 second
        setPhase2SpacingAlign(true);
        setTimeout(() => setPhase2SpacingAlign(false), 1000);
      }, 60000);

      return () => clearTimeout(timer);
    }
  }, [currentPhase, completedPhases]);

  // Phase 1: Multi-click handler
  const handleAccessClick = async () => {
    const now = Date.now();

    // Reset if more than 3 seconds passed
    if (phase1StartTime.current === 0 || now - phase1StartTime.current > 3000) {
      setClickCount(1);
      phase1StartTime.current = now;
      return;
    }

    const newClickCount = clickCount + 1;
    setClickCount(newClickCount);

    // Check if 5 clicks within 3 seconds
    if (newClickCount === 5 && now - phase1StartTime.current <= 3000) {
      await submitPhase(1, 'ACCESS-SEQUENCE');
    }
  };

  // Phase 2: Arrow key handler
  useEffect(() => {
    if (currentPhase !== 2 || completedPhases.includes(2)) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key;

      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
        e.preventDefault();

        const keyMap: Record<string, string> = {
          ArrowUp: '↑',
          ArrowDown: '↓',
          ArrowLeft: '←',
          ArrowRight: '→',
        };

        const newSequence = [...keySequence, keyMap[key]];
        setKeySequence(newSequence);

        // Check if sequence matches ↑↑↓↓←→←→
        const targetSequence = ['↑', '↑', '↓', '↓', '←', '→', '←', '→'];

        if (newSequence.length === targetSequence.length) {
          const isCorrect = newSequence.every((k, i) => k === targetSequence[i]);

          if (isCorrect) {
            submitPhase(2, 'KONAMI-VARIANT');
          } else {
            // Reset on incorrect
            setTimeout(() => setKeySequence([]), 500);
          }
        } else if (newSequence.length > targetSequence.length) {
          // Reset if too long
          setTimeout(() => setKeySequence([]), 500);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPhase, completedPhases, keySequence]);

  // Phase 3: Error line click handler
  const handleErrorClick = async (errorId: number) => {
    if (currentPhase !== 3 || completedPhases.includes(3)) return;

    const error = ERROR_LOGS.find((e) => e.id === errorId);
    if (!error) return;

    // Check if it's red
    if (error.color !== 'red') {
      // Wrong color clicked - shake and reset
      setPhase3Failed(true);
      setSelectedErrors([]);
      setTimeout(() => setPhase3Failed(false), 500);
      return;
    }

    // Add to selected
    const newSelected = [...selectedErrors, errorId];
    setSelectedErrors(newSelected);

    // Check if all red errors selected in order
    const redErrors = ERROR_LOGS.filter((e) => e.color === 'red').map((e) => e.id);
    const isCorrect = newSelected.length === redErrors.length &&
      newSelected.every((id, index) => id === redErrors[index]);

    if (isCorrect) {
      await submitPhase(3, 'ERROR-FILTER');
    }
  };

  // Submit phase to server
  const submitPhase = async (phase: number, input: string) => {
    if (loading) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/levels/3.1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phase, input }),
      });

      const data = await res.json();

      if (res.status === 429) {
        // Rate limited
        setError(data.error || 'Rate limit exceeded. Please wait.');
        setGlitchIntensity(3);
        setTimeout(() => setGlitchIntensity(1), 1000);
        return;
      }

      if (!res.ok) {
        setError(data.error || 'An error occurred');
        setGlitchIntensity(2);
        setTimeout(() => setGlitchIntensity(1), 1000);
        return;
      }

      if (data.success) {
        setSuccess(data.message);
        setFragments([...fragments, data.fragment]);

        if (!completedPhases.includes(phase)) {
          setCompletedPhases([...completedPhases, phase]);
        }

        if (data.allComplete) {
          setAllComplete(true);
          setGlitchIntensity(0); // Stabilize

          // Auto-submit final flag
          setTimeout(async () => {
            const submitRes = await fetch('/api/submit-flag', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ level: '3.1', flag: data.finalFlag }),
            });

            const submitData = await submitRes.json();

            // Refresh session
            await update();

            // Redirect after 2 seconds - use completionPage from API response
            setTimeout(() => {
              const redirectPath = submitData.completionPage || `/levels/${submitData.nextLevel}` || '/';
              router.push(redirectPath);
            }, 2000);
          }, 1000);
        } else {
          setCurrentPhase(data.nextPhase);
          // Reset phase-specific state
          setClickCount(0);
          setKeySequence([]);
          setSelectedErrors([]);
        }
      } else {
        setError(data.message || 'Incorrect input');
        setGlitchIntensity(2);
        setTimeout(() => setGlitchIntensity(1), 1000);
      }
    } catch (err: any) {
      setError('Network error. Please try again.');
      setGlitchIntensity(2);
      setTimeout(() => setGlitchIntensity(1), 1000);
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (isChecking || !canAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-hero">
        <div className="text-cyan-400 text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden p-6"
      style={{ backgroundColor: '#05070b' }}>

      {/* Scanline Effect */}
      <div
        className="absolute inset-0 pointer-events-none z-50 opacity-20"
        style={{
          background: `repeating-linear-gradient(
            0deg,
            transparent,
            transparent ${scanlineOffset}px,
            rgba(255, 0, 51, 0.1) ${scanlineOffset}px,
            rgba(255, 0, 51, 0.1) ${scanlineOffset + 2}px
          )`,
        }}
      />

      {/* Glitch Overlay */}
      <motion.div
        className="absolute inset-0 pointer-events-none z-40"
        animate={{
          opacity: [0, 0.1 * glitchIntensity, 0],
          x: [-2 * glitchIntensity, 2 * glitchIntensity, 0],
        }}
        transition={{ duration: 0.2, repeat: Infinity, repeatDelay: Math.random() * 2 }}
        style={{
          background: 'linear-gradient(90deg, #ff0033, transparent, #00ff99)',
          mixBlendMode: 'screen',
        }}
      />

      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 w-full max-w-4xl"
      >
        {/* Corrupted Header */}
        <motion.div
          className="mb-8 text-center"
          animate={{
            x: [-1, 1, 0],
            opacity: allComplete ? 1 : [0.9, 1, 0.9],
          }}
          transition={{ duration: 0.5, repeat: allComplete ? 0 : Infinity }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/30 mb-4">
            <AlertTriangle className="w-5 h-5 text-red-400 animate-pulse" />
            <span className="text-sm text-red-300 font-mono">
              SYSTEM ALERT: Interface Corruption Detected
            </span>
          </div>

          <h1
            className="text-4xl md:text-5xl font-bold mb-2 tracking-tight"
            style={{
              color: allComplete ? '#00ff99' : '#ff0033',
              textShadow: allComplete ? '0 0 20px #00ff99' : '0 0 20px #ff0033',
              letterSpacing: '0.05em',
            }}
          >
            {allComplete ? 'INTERFACE RESTORED' : 'THE BROKEN INTERFACE'}
          </h1>

          <p className="text-white/60 text-sm font-mono">
            Module: <span className="text-red-400">user-interface.renderer.js</span>
            <br />
            Status: <span className={allComplete ? 'text-green-400' : 'text-red-400'}>
              {allComplete ? 'OPERATIONAL' : 'FAILED'}
            </span>
          </p>
        </motion.div>

        {/* Error/Success Messages */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-300 text-sm font-mono"
            >
              {error}
            </motion.div>
          )}

          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-4 p-3 bg-green-500/10 border border-green-500/50 rounded-lg text-green-300 text-sm font-mono"
            >
              {success}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Fragments Display */}
        {fragments.length > 0 && (
          <div className="mb-6 p-4 bg-black/40 border border-cyan-500/30 rounded-lg">
            <p className="text-cyan-400 text-xs mb-2 font-mono">FRAGMENTS COLLECTED:</p>
            <div className="flex gap-2 flex-wrap">
              {fragments.map((frag, idx) => (
                <motion.div
                  key={idx}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="px-3 py-1 bg-cyan-500/20 border border-cyan-500/50 rounded text-cyan-300 font-mono text-sm"
                >
                  {frag}
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Phase 1: Multi-Click */}
        {currentPhase === 1 && !completedPhases.includes(1) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-6 bg-black/50 border border-red-500/30 rounded-lg"
          >
            <motion.div
              className="text-center cursor-pointer select-none"
              onClick={handleAccessClick}
              animate={{
                x: phase1Hint ? [-2, 2, -2, 2, 0] : 0,
                opacity: phase1Hint ? [1, 0.7, 1, 0.7, 1] : 1,
              }}
              transition={{
                duration: phase1Hint ? 0.75 : 0,
                repeat: phase1Hint ? 5 : 0,
              }}
            >
              <p className="text-2xl md:text-3xl font-bold text-red-300 font-mono mb-2">
                ERROR 404: <span style={{ marginLeft: '0.1em' }}>Access</span>    Denied
              </p>
              <p className="text-white/40 text-xs">
                {clickCount > 0 && `(${clickCount}/5)`}
              </p>
            </motion.div>

            {phase1Hint && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                className="text-center text-yellow-400 text-xs mt-4 font-mono"
              >
                💡 Something flickers five times...
              </motion.p>
            )}
          </motion.div>
        )}

        {/* Phase 2: Arrow Keys */}
        {currentPhase === 2 && !completedPhases.includes(2) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-6 bg-black/50 border border-red-500/30 rounded-lg"
          >
            <div className="space-y-2 font-mono text-sm text-red-300">
              <motion.div
                animate={{
                  marginLeft: phase2SpacingAlign ? '0px' : '20px',
                }}
                transition={{ duration: 0.3 }}
              >
                ERR_UP      ERR_UP
              </motion.div>
              <motion.div
                animate={{
                  marginLeft: phase2SpacingAlign ? '0px' : '35px',
                }}
                transition={{ duration: 0.3 }}
              >
                ERR_DOWN    ERR_DOWN
              </motion.div>
              <motion.div
                animate={{
                  marginLeft: phase2SpacingAlign ? '0px' : '15px',
                }}
                transition={{ duration: 0.3 }}
              >
                ERR_LEFT    ERR_RIGHT    ERR_LEFT    ERR_RIGHT
              </motion.div>
            </div>

            {keySequence.length > 0 && (
              <div className="mt-4 text-center">
                <p className="text-white/60 text-xs font-mono">
                  Sequence: {keySequence.join(' ')}
                </p>
              </div>
            )}

            {phase2Hint && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                className="text-center text-yellow-400 text-xs mt-4 font-mono"
              >
                💡 The spacing reveals a pattern...
              </motion.p>
            )}
          </motion.div>
        )}

        {/* Phase 3: Red Errors */}
        {currentPhase === 3 && !completedPhases.includes(3) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-6 bg-black/50 border border-red-500/30 rounded-lg"
          >
            <p className="text-white/40 text-xs mb-4 font-mono text-center italic">
              ... only the red ones remain stable ...
            </p>

            <motion.div
              className="space-y-2"
              animate={phase3Failed ? { x: [-10, 10, -10, 10, 0] } : {}}
              transition={{ duration: 0.5 }}
            >
              {ERROR_LOGS.map((log) => {
                const isSelected = selectedErrors.includes(log.id);
                const colorMap: Record<string, string> = {
                  red: '#ff0033',
                  yellow: '#ffcc00',
                  blue: '#0099ff',
                  green: '#00ff99',
                  purple: '#cc00ff',
                };

                return (
                  <motion.div
                    key={log.id}
                    onClick={() => handleErrorClick(log.id)}
                    className="p-3 cursor-pointer border rounded font-mono text-sm transition-all"
                    style={{
                      color: colorMap[log.color],
                      borderColor: isSelected ? '#00ff99' : `${colorMap[log.color]}50`,
                      backgroundColor: isSelected ? '#00ff9920' : 'transparent',
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {log.code} — {log.text}
                  </motion.div>
                );
              })}
            </motion.div>
          </motion.div>
        )}

        {/* All Complete */}
        {allComplete && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="text-center p-8 bg-green-500/10 border border-green-500/50 rounded-lg"
          >
            <Check className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-green-300 mb-2">
              INTERFACE RESTORED
            </h2>
            <p className="text-white/80 text-sm mb-4">
              The broken interface was never broken. You are.
            </p>
            <p className="text-green-400 font-mono text-sm">
              FLAG{'{'}INTERFACE_NOT_BROKEN_YOU_ARE{'}'}
            </p>
            <p className="text-white/40 text-xs mt-4">
              Redirecting to dashboard...
            </p>
          </motion.div>
        )}
      </motion.div>
    </section>
  );
}
