"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useLevelAccess } from "@/lib/useLevelAccess";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Zap, Check, Lock, Skull } from "lucide-react";
import { useSession } from "next-auth/react";
import "@/app/styles/cyber-global.css";

// Expanded error logs for Phase 3 (15 total, 5 critical)
const ERROR_LOGS = [
  { id: 1, code: 'ERR-11', color: 'red', text: 'CRITICAL_MEMORY_LEAK_FATAL', critical: true },
  { id: 2, code: 'ERR-28', color: 'yellow', text: 'CACHE_OVERFLOW_WARNING', critical: false },
  { id: 3, code: 'ERR-07', color: 'blue', text: 'NETWORK_TIMEOUT_ERROR', critical: false },
  { id: 4, code: 'ERR-44', color: 'red', text: 'STACK_CORRUPTION_IMMINENT', critical: true },
  { id: 5, code: 'ERR-13', color: 'green', text: 'PROCESS_SPAWN_SUCCESS', critical: false },
  { id: 6, code: 'ERR-31', color: 'red', text: 'SEGFAULT_VIOLATION_CRITICAL', critical: true },
  { id: 7, code: 'ERR-92', color: 'purple', text: 'THREAD_DEADLOCK_DETECTED', critical: false },
  { id: 8, code: 'ERR-55', color: 'cyan', text: 'BUFFER_UNDERFLOW_INFO', critical: false },
  { id: 9, code: 'ERR-88', color: 'red', text: 'KERNEL_PANIC_EMERGENCY', critical: true },
  { id: 10, code: 'ERR-19', color: 'yellow', text: 'DISK_SPACE_LOW_WARNING', critical: false },
  { id: 11, code: 'ERR-66', color: 'blue', text: 'CONNECTION_RESET_PEER', critical: false },
  { id: 12, code: 'ERR-77', color: 'red', text: 'HEAP_OVERFLOW_EXPLOIT_DETECTED', critical: true },
  { id: 13, code: 'ERR-33', color: 'green', text: 'SERVICE_RESTART_OK', critical: false },
  { id: 14, code: 'ERR-22', color: 'purple', text: 'MUTEX_WAIT_TIMEOUT', critical: false },
  { id: 15, code: 'ERR-99', color: 'cyan', text: 'LOGGING_BUFFER_FULL', critical: false },
];

export default function LevelThreeOne() {
  const router = useRouter();
  const { canAccess, isChecking } = useLevelAccess('3.1');
  const { update } = useSession();

  // Phase tracking
  const [currentPhase, setCurrentPhase] = useState<number>(1);
  const [completedPhases, setCompletedPhases] = useState<number[]>([]);
  const [fragments, setFragments] = useState<string[]>([]);

  // Phase 1: Rapid multi-click (12 clicks in 2.5 seconds)
  const [clickCount, setClickCount] = useState<number>(0);
  const [phase1Timer, setPhase1Timer] = useState<number>(0);
  const phase1StartTime = useRef<number>(0);

  // Phase 2: Extended arrow key sequence
  const [keySequence, setKeySequence] = useState<string[]>([]);
  const [phase2Failed, setPhase2Failed] = useState<boolean>(false);

  // Phase 3: Critical error triage (5 critical errors)
  const [selectedErrors, setSelectedErrors] = useState<number[]>([]);
  const [phase3Failed, setPhase3Failed] = useState<boolean>(false);
  const [phase3Timer, setPhase3Timer] = useState<number>(10);

  // Phase 4: Cipher decode
  const [cipherInput, setCipherInput] = useState<string>('');
  const [phase4Hint, setPhase4Hint] = useState<boolean>(false);

  // Phase 5: Final authentication
  const [finalInput, setFinalInput] = useState<string>('');

  // General state
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [allComplete, setAllComplete] = useState<boolean>(false);

  // Visual effects
  const [glitchIntensity, setGlitchIntensity] = useState<number>(2);
  const [scanlineOffset, setScanlineOffset] = useState<number>(0);

  // Fetch progress
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
      setScanlineOffset((prev) => (prev + 3) % 100);
    }, 40);
    return () => clearInterval(interval);
  }, []);

  // Phase 3 countdown timer
  useEffect(() => {
    if (currentPhase === 3 && !completedPhases.includes(3) && phase3Timer > 0) {
      const interval = setInterval(() => {
        setPhase3Timer((prev) => {
          if (prev <= 1) {
            // Time's up - reset
            setSelectedErrors([]);
            return 10;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [currentPhase, completedPhases, phase3Timer]);

  // Phase 4 hint timer (90 seconds)
  useEffect(() => {
    if (currentPhase === 4 && !completedPhases.includes(4)) {
      const timer = setTimeout(() => {
        setPhase4Hint(true);
      }, 90000);
      return () => clearTimeout(timer);
    }
  }, [currentPhase, completedPhases]);

  // Phase 1: Rapid clicking (12 clicks in 2.5 seconds)
  const handleAccessClick = async () => {
    const now = Date.now();

    if (phase1StartTime.current === 0 || now - phase1StartTime.current > 2500) {
      setClickCount(1);
      phase1StartTime.current = now;
      setPhase1Timer(2500);
      return;
    }

    const newClickCount = clickCount + 1;
    setClickCount(newClickCount);
    setPhase1Timer(2500 - (now - phase1StartTime.current));

    if (newClickCount === 12 && now - phase1StartTime.current <= 2500) {
      await submitPhase(1, 'RAPID-ACCESS-OVERRIDE');
    }
  };

  // Phase 2: Extended Konami code ↑↑↓↓←→←→↓→↓→
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

        // Extended sequence: ↑↑↓↓←→←→↓→↓→
        const targetSequence = ['↑', '↑', '↓', '↓', '←', '→', '←', '→', '↓', '→', '↓', '→'];

        if (newSequence.length === targetSequence.length) {
          const isCorrect = newSequence.every((k, i) => k === targetSequence[i]);

          if (isCorrect) {
            submitPhase(2, 'EXTENDED-KONAMI-CIPHER');
          } else {
            setPhase2Failed(true);
            setTimeout(() => {
              setKeySequence([]);
              setPhase2Failed(false);
            }, 800);
          }
        } else if (newSequence.length > targetSequence.length) {
          setPhase2Failed(true);
          setTimeout(() => {
            setKeySequence([]);
            setPhase2Failed(false);
          }, 800);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPhase, completedPhases, keySequence]);

  // Phase 3: Critical error triage (select 5 red errors in exact order, within 10 seconds)
  const handleErrorClick = async (errorId: number) => {
    if (currentPhase !== 3 || completedPhases.includes(3)) return;

    const error = ERROR_LOGS.find((e) => e.id === errorId);
    if (!error) return;

    // Must click critical (red) errors only
    if (!error.critical || error.color !== 'red') {
      setPhase3Failed(true);
      setSelectedErrors([]);
      setPhase3Timer(10);
      setTimeout(() => setPhase3Failed(false), 600);
      return;
    }

    const newSelected = [...selectedErrors, errorId];
    setSelectedErrors(newSelected);

    // Get all critical errors in order
    const criticalErrors = ERROR_LOGS.filter((e) => e.critical && e.color === 'red').map((e) => e.id);
    const isComplete = newSelected.length === criticalErrors.length &&
      newSelected.every((id, index) => id === criticalErrors[index]);

    if (isComplete) {
      await submitPhase(3, 'CRITICAL-ERROR-TRIAGE');
    }
  };

  // Phase 4: Cipher decode (ROT13)
  const handleCipherSubmit = async () => {
    await submitPhase(4, cipherInput.trim());
  };

  // Phase 5: Final authentication
  const handleFinalSubmit = async () => {
    await submitPhase(5, finalInput.trim());
  };

  // Submit phase
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
        setError(data.error || 'Rate limit exceeded. Please wait.');
        setGlitchIntensity(4);
        setTimeout(() => setGlitchIntensity(2), 1200);
        return;
      }

      if (!res.ok) {
        setError(data.error || 'An error occurred');
        setGlitchIntensity(3);
        setTimeout(() => setGlitchIntensity(2), 1000);
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
          setGlitchIntensity(0);

          setTimeout(async () => {
            const submitRes = await fetch('/api/submit-flag', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ level: '3.1', flag: data.finalFlag }),
            });

            const submitData = await submitRes.json();
            await update();

            setTimeout(() => {
              const redirectPath = submitData.completionPage || `/levels/${submitData.nextLevel}` || '/';
              router.push(redirectPath);
            }, 2000);
          }, 1000);
        } else {
          setCurrentPhase(data.nextPhase);
          setClickCount(0);
          setKeySequence([]);
          setSelectedErrors([]);
          setCipherInput('');
          setFinalInput('');
          setPhase3Timer(10);
        }
      } else {
        setError(data.message || 'Incorrect input');
        setGlitchIntensity(3);
        setTimeout(() => setGlitchIntensity(2), 1000);
      }
    } catch (err: any) {
      setError('Network error. Please try again.');
      setGlitchIntensity(3);
      setTimeout(() => setGlitchIntensity(2), 1000);
    } finally {
      setLoading(false);
    }
  };

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-hero">
        <div className="text-cyan-400 text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <section className="relative min-h-screen w-full flex items-center justify-center overflow-hidden p-6">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-hero" />
      <div
        className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--grid-color))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--grid-color))_1px,transparent_1px)] bg-[size:3rem_3rem]"
        style={{
          opacity: 0.3 + (glitchIntensity * 0.1),
          filter: `hue-rotate(${glitchIntensity * 30}deg)`,
        }}
      />

      {/* Glitch effects */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `linear-gradient(180deg, transparent ${scanlineOffset}%, rgba(0,255,255,0.05) ${scanlineOffset + 1}%, transparent ${scanlineOffset + 2}%)`,
        }}
      />

      {/* Main Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 container mx-auto max-w-4xl"
      >
        <div className="bg-black/60 border-2 border-red-500/40 rounded-3xl p-8 backdrop-blur-xl shadow-2xl"
          style={{
            boxShadow: `0 0 ${20 + glitchIntensity * 10}px rgba(255, 0, 0, 0.${3 + glitchIntensity})`,
          }}>

          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <Skull className="w-10 h-10 text-red-500 animate-pulse" />
            <div>
              <h1
                className="text-4xl font-bold"
                style={{
                  background: "linear-gradient(90deg,#ff0000,#ff6600,#ff0000)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Level 3.1 — The Gauntlet
              </h1>
              <p className="text-red-400/80 text-sm">
                5 Phases • Advanced Difficulty • No Mercy
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between text-xs text-foreground/60 mb-2">
              <span>Progress: Phase {currentPhase}/5</span>
              <span>{completedPhases.length}/5 Completed</span>
            </div>
            <div className="h-3 bg-black/60 rounded-full overflow-hidden border border-red-500/30">
              <motion.div
                className="h-full bg-gradient-to-r from-red-600 to-orange-500"
                initial={{ width: 0 }}
                animate={{ width: `${(completedPhases.length / 5) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          {/* Phase Content */}
          <div className="min-h-[400px]">
            <AnimatePresence mode="wait">
              {/* Phase 1: Rapid Click */}
              {currentPhase === 1 && !completedPhases.includes(1) && (
                <motion.div
                  key="phase1"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-6"
                >
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6">
                    <h3 className="text-2xl font-bold text-red-400 mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-6 h-6" />
                      Phase 1: Rapid Access Override
                    </h3>
                    <p className="text-foreground/80 mb-4">
                      The system requires rapid authentication. Click the ACCESS button
                      <span className="text-red-300 font-bold"> 12 times within 2.5 seconds</span>.
                    </p>
                    <div className="text-center mb-4">
                      <div className="text-5xl font-mono text-cyan-400 mb-2">{clickCount}/12</div>
                      {clickCount > 0 && (
                        <div className="text-xl text-yellow-400 font-mono">
                          {Math.max(0, Math.ceil(phase1Timer / 1000))}s remaining
                        </div>
                      )}
                    </div>
                    <div className="flex justify-center">
                      <Button
                        onClick={handleAccessClick}
                        disabled={loading}
                        className="bg-red-600 hover:bg-red-700 px-12 py-8 text-2xl font-bold rounded-xl"
                      >
                        <Zap className="w-6 h-6 mr-2" />
                        ACCESS
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Phase 2: Extended Konami Code */}
              {currentPhase === 2 && !completedPhases.includes(2) && (
                <motion.div
                  key="phase2"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-6"
                >
                  <div className={`border rounded-xl p-6 ${phase2Failed ? 'bg-red-500/20 border-red-500' : 'bg-purple-500/10 border-purple-500/30'}`}>
                    <h3 className="text-2xl font-bold text-purple-400 mb-3">
                      Phase 2: Extended Cipher Sequence
                    </h3>
                    <p className="text-foreground/80 mb-4">
                      Enter the extended arrow key sequence. This is a 12-key cipher pattern.
                      <br />
                      <span className="text-yellow-400 text-sm">Hint: It starts with a classic pattern...</span>
                    </p>
                    <div className="bg-black/40 rounded-xl p-6 font-mono text-3xl text-center mb-4 min-h-[80px] flex items-center justify-center">
                      {keySequence.length > 0 ? keySequence.join(' ') : '..waiting for input..'}
                    </div>
                    <div className="text-center text-cyan-400 text-sm">
                      {keySequence.length}/12 keys entered
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Phase 3: Critical Error Triage */}
              {currentPhase === 3 && !completedPhases.includes(3) && (
                <motion.div
                  key="phase3"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-6"
                >
                  <div className={`border rounded-xl p-6 ${phase3Failed ? 'bg-red-500/20 border-red-500' : 'bg-orange-500/10 border-orange-500/30'}`}>
                    <h3 className="text-2xl font-bold text-orange-400 mb-3 flex items-center justify-between">
                      <span>Phase 3: Critical Error Triage</span>
                      <span className="text-4xl text-red-500 font-mono">{phase3Timer}s</span>
                    </h3>
                    <p className="text-foreground/80 mb-4">
                      Select ALL critical (red) errors in the exact order they appear.
                      <span className="text-red-400 font-bold"> You have 10 seconds.</span>
                    </p>
                    <div className="bg-black/60 rounded-xl p-4 max-h-[300px] overflow-y-auto space-y-2">
                      {ERROR_LOGS.map((log) => (
                        <div
                          key={log.id}
                          onClick={() => handleErrorClick(log.id)}
                          className={`p-3 rounded-lg cursor-pointer transition-all border ${
                            selectedErrors.includes(log.id)
                              ? 'bg-green-500/30 border-green-500'
                              : log.color === 'red'
                              ? 'bg-red-500/10 border-red-500/50 hover:bg-red-500/20'
                              : log.color === 'yellow'
                              ? 'bg-yellow-500/10 border-yellow-500/30'
                              : log.color === 'blue'
                              ? 'bg-blue-500/10 border-blue-500/30'
                              : log.color === 'purple'
                              ? 'bg-purple-500/10 border-purple-500/30'
                              : log.color === 'green'
                              ? 'bg-green-500/10 border-green-500/30'
                              : 'bg-cyan-500/10 border-cyan-500/30'
                          }`}
                        >
                          <span className={`font-mono text-sm ${
                            log.color === 'red' ? 'text-red-400' :
                            log.color === 'yellow' ? 'text-yellow-400' :
                            log.color === 'blue' ? 'text-blue-400' :
                            log.color === 'purple' ? 'text-purple-400' :
                            log.color === 'green' ? 'text-green-400' :
                            'text-cyan-400'
                          }`}>
                            [{log.code}] {log.text}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 text-center text-foreground/60 text-sm">
                      Selected: {selectedErrors.length}/5
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Phase 4: Cipher Decode */}
              {currentPhase === 4 && !completedPhases.includes(4) && (
                <motion.div
                  key="phase4"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-6"
                >
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6">
                    <h3 className="text-2xl font-bold text-blue-400 mb-3 flex items-center gap-2">
                      <Lock className="w-6 h-6" />
                      Phase 4: Cipher Matrix Decode
                    </h3>
                    <p className="text-foreground/80 mb-4">
                      Decode the encrypted authentication key below. The system uses a classic cipher.
                    </p>
                    <div className="bg-black/60 rounded-xl p-6 mb-4">
                      <div className="text-center text-green-400 font-mono text-2xl mb-2">
                        PVCURE-ZNGEVK-QRPBQR
                      </div>
                      <div className="text-center text-foreground/50 text-xs">
                        [ENCRYPTED AUTHENTICATION KEY]
                      </div>
                    </div>
                    {phase4Hint && (
                      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-4 text-sm text-yellow-300">
                        💡 Hint: ROT13 is a simple letter substitution cipher (A↔N, B↔O, etc.)
                      </div>
                    )}
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={cipherInput}
                        onChange={(e) => setCipherInput(e.target.value)}
                        placeholder="Enter decoded key..."
                        className="w-full p-4 rounded-xl bg-black/40 border border-blue-500/40 text-foreground font-mono text-lg"
                        disabled={loading}
                      />
                      <Button
                        onClick={handleCipherSubmit}
                        disabled={loading || !cipherInput.trim()}
                        className="w-full bg-blue-600 hover:bg-blue-700 py-6 text-xl font-bold"
                      >
                        Submit Decoded Key
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Phase 5: Final Authentication */}
              {currentPhase === 5 && !completedPhases.includes(5) && (
                <motion.div
                  key="phase5"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-6"
                >
                  <div className="bg-gradient-to-br from-red-500/10 via-purple-500/10 to-blue-500/10 border-2 border-cyan-500/50 rounded-xl p-6">
                    <h3 className="text-2xl font-bold text-cyan-400 mb-3 flex items-center gap-2">
                      <Check className="w-6 h-6" />
                      Phase 5: Final Authentication
                    </h3>
                    <p className="text-foreground/80 mb-4">
                      The final gate requires the ultimate passphrase. Combine all your knowledge.
                      <br />
                      <span className="text-yellow-400 text-sm">Think about what connects all phases...</span>
                    </p>
                    <div className="bg-black/60 rounded-xl p-6 mb-4 space-y-2 text-sm font-mono text-foreground/70">
                      <div>Phase 1: RAPID-?-?</div>
                      <div>Phase 2: EXTENDED-?-?</div>
                      <div>Phase 3: CRITICAL-?-?</div>
                      <div>Phase 4: CIPHER-?-?</div>
                      <div className="text-cyan-400 text-base">Final Key: ?-?-?</div>
                    </div>
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={finalInput}
                        onChange={(e) => setFinalInput(e.target.value)}
                        placeholder="Enter final authentication key..."
                        className="w-full p-4 rounded-xl bg-black/40 border border-cyan-500/40 text-foreground font-mono text-lg"
                        disabled={loading}
                      />
                      <Button
                        onClick={handleFinalSubmit}
                        disabled={loading || !finalInput.trim()}
                        className="w-full bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-700 hover:to-purple-700 py-6 text-xl font-bold"
                      >
                        Final Submit
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* All Complete */}
              {allComplete && (
                <motion.div
                  key="complete"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-12"
                >
                  <Check className="w-24 h-24 text-green-400 mx-auto mb-6 animate-pulse" />
                  <h2 className="text-4xl font-bold text-green-400 mb-4">
                    ALL PHASES COMPLETED!
                  </h2>
                  <p className="text-foreground/80 text-xl">
                    The gauntlet has been conquered. Redirecting...
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Status Messages */}
          {error && (
            <div className="mt-6 p-4 bg-red-500/20 border border-red-500 rounded-xl text-red-400 text-center animate-pulse">
              {error}
            </div>
          )}

          {success && (
            <div className="mt-6 p-4 bg-green-500/20 border border-green-500 rounded-xl text-green-400 text-center">
              {success}
            </div>
          )}

          {/* Fragments Display */}
          {fragments.length > 0 && !allComplete && (
            <div className="mt-6 p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-xl">
              <div className="text-xs text-cyan-400 mb-2">Collected Fragments:</div>
              <div className="font-mono text-sm text-foreground/70">
                {fragments.join('')}...
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </section>
  );
}
