"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Trophy, CheckCircle2, Clock, Award, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import "@/app/styles/cyber-global.css";

export default function FinalCompleted() {
  const router = useRouter();
  const { data: session } = useSession();
  const [totalTime, setTotalTime] = useState<number>(0);

  useEffect(() => {
    // Fetch final time from server
    const fetchTime = async () => {
      try {
        const res = await fetch('/api/timer');
        if (res.ok) {
          const data = await res.json();
          setTotalTime(Math.floor(data.totalTime / 1000));

          // Stop the timer
          await fetch('/api/timer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'stop' }),
          });
        }
      } catch (error) {
        console.error('Failed to fetch time:', error);
      }
    };

    if (session?.user) {
      fetchTime();
    }
  }, [session]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <section className="relative min-h-screen w-full flex items-center justify-center overflow-hidden p-10">
      {/* Background Layers */}
      <div className="absolute inset-0 bg-gradient-hero" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--grid-color))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--grid-color))_1px,transparent_1px)] bg-[size:4rem_4rem]" />

      {/* Animated Glow Orbs */}
      <motion.div
        className="absolute -left-20 top-1/4 w-[500px] h-[500px] rounded-full blur-[140px]"
        style={{ background: "radial-gradient(circle,#00ff8833,transparent 70%)" }}
        animate={{ y: [0, 20, 0], x: [0, 15, 0] }}
        transition={{ duration: 8, repeat: Infinity }}
      />

      <motion.div
        className="absolute -right-20 bottom-1/4 w-[500px] h-[500px] rounded-full blur-[130px]"
        style={{ background: "radial-gradient(circle,#a86bff44,transparent 70%)" }}
        animate={{ y: [0, -20, 0], x: [0, -15, 0] }}
        transition={{ duration: 9, repeat: Infinity }}
      />

      <motion.div
        className="absolute top-1/2 left-1/2 w-[400px] h-[400px] rounded-full blur-[150px]"
        style={{ background: "radial-gradient(circle,#08f9ff22,transparent 70%)" }}
        animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }}
        transition={{ duration: 12, repeat: Infinity }}
      />

      {/* Success Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.85, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.8, type: "spring", bounce: 0.3 }}
        className="relative z-10 max-w-3xl w-full bg-black/50 border-2 border-primary/40 backdrop-blur-2xl p-12 rounded-3xl shadow-2xl"
      >
        {/* Trophy Icon */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.3, duration: 0.6, type: "spring" }}
          className="flex justify-center mb-8"
        >
          <div className="relative">
            <Trophy className="w-24 h-24 text-yellow-400 drop-shadow-[0_0_30px_rgba(234,179,8,0.8)]" />
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              className="absolute -top-2 -right-2"
            >
              <Star className="w-8 h-8 text-yellow-300" fill="currentColor" />
            </motion.div>
          </div>
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-center text-5xl md:text-6xl font-extrabold mb-4"
          style={{
            background: "linear-gradient(90deg,#fbbf24,#00ff88,#08f9ff,#a86bff)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          🎉 ALL LEVELS CONQUERED! 🎉
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-foreground/90 text-xl leading-relaxed mb-6"
        >
          Legendary work, <span className="text-primary font-bold">{session?.user?.teamName || 'Elite Hacker'}</span>!
          <br />
          You've mastered all 8 CTF challenges across 3 chapters.
        </motion.p>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
        >
          <div className="bg-black/40 border border-green-500/30 rounded-xl p-4 text-center">
            <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-green-400">8/8</div>
            <div className="text-sm text-foreground/60">Levels Completed</div>
          </div>

          <div className="bg-black/40 border border-cyan-500/30 rounded-xl p-4 text-center">
            <Clock className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-cyan-400 font-mono">
              {formatTime(totalTime)}
            </div>
            <div className="text-sm text-foreground/60">Total Time</div>
          </div>

          <div className="bg-black/40 border border-yellow-500/30 rounded-xl p-4 text-center">
            <Award className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-yellow-400">1850</div>
            <div className="text-sm text-foreground/60">Points Earned</div>
          </div>
        </motion.div>

        {/* Achievement Badges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="grid grid-cols-3 gap-3 mb-8"
        >
          <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-cyan-500/30 rounded-lg p-3 text-center">
            <div className="text-3xl mb-1">🔍</div>
            <div className="text-xs text-cyan-400 font-semibold">Chapter 1</div>
            <div className="text-[10px] text-foreground/60">Client-Side</div>
          </div>

          <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-lg p-3 text-center">
            <div className="text-3xl mb-1">🛡️</div>
            <div className="text-xs text-purple-400 font-semibold">Chapter 2</div>
            <div className="text-[10px] text-foreground/60">Server-Side</div>
          </div>

          <div className="bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/30 rounded-lg p-3 text-center">
            <div className="text-3xl mb-1">⚔️</div>
            <div className="text-xs text-orange-400 font-semibold">Chapter 3</div>
            <div className="text-[10px] text-foreground/60">Advanced</div>
          </div>
        </motion.div>

        {/* Message */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="bg-primary/10 border border-primary/30 rounded-xl p-6 mb-8"
        >
          <p className="text-center text-foreground/80 italic leading-relaxed">
            "Security is not a product, but a process. You've demonstrated exceptional critical thinking
            and technical skills needed to identify and exploit common web vulnerabilities. From simple
            HTML comments to complex NoSQL injections, you've proven yourself a true cybersecurity champion.
            Keep hacking, keep learning, and use your powers responsibly!"
          </p>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="flex flex-col md:flex-row gap-4 justify-center"
        >
          <Button
            size="lg"
            className="bg-gradient-to-r from-cyan-500 to-purple-500 px-8 py-6 rounded-xl text-white text-lg font-bold shadow-[0_0_25px_rgba(0,255,255,0.5)] hover:shadow-[0_0_40px_rgba(0,255,255,0.7)] transition-all"
            onClick={() => router.push("/")}
          >
            Back to Home
          </Button>

          {session?.user?.isAdmin && (
            <Button
              size="lg"
              variant="outline"
              className="border-2 border-purple-500/50 px-8 py-6 rounded-xl text-purple-400 text-lg font-bold hover:bg-purple-500/10 transition-all"
              onClick={() => router.push("/admin")}
            >
              Admin Dashboard
            </Button>
          )}

          <Button
            size="lg"
            variant="outline"
            className="border-2 border-green-500/50 px-8 py-6 rounded-xl text-green-400 text-lg font-bold hover:bg-green-500/10 transition-all"
            onClick={() => router.push("/levels/1.1")}
          >
            Play Again
          </Button>
        </motion.div>
      </motion.div>
    </section>
  );
}
