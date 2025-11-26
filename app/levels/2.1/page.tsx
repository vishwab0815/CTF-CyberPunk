"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

import AuroraBackground from "@/components/visuals/AuroraBackground";
import LevelCard from "@/components/LevelCard";
import Terminal from "@/components/Terminal";
import { btnTap } from "@/lib/animation";
import { useLevelAccess } from "@/lib/useLevelAccess";
import { useSession } from "next-auth/react";
import "@/app/styles/cyber-global.css";
import { Button } from "@/components/ui/button";

type Profile = {
  id: number;
  name: string;
  role?: string;
  ghost_token?: string;
  [k: string]: any;
};

export default function LevelTwoOnePage() {
  const router = useRouter();
  const { canAccess, isChecking } = useLevelAccess('2.1');
  const { update } = useSession();

  const [userId] = useState<number>(1001);
  const [inputId, setInputId] = useState<string>("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState<boolean>(false);

  async function loadProfile(id: number) {
    setLoading(true);
    setProfile(null);
    setError(null);
    setHasSearched(true);

    try {
      const res = await fetch("/api/levels/2.1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      const data = await res.json();
      console.log( data);

      if (!res.ok) {
        setError(data.error ?? `HTTP ${res.status}`);
      } else {
        setProfile(data as Profile);

        // Auto-submit if ghost_token found
        if (data.ghost_token) {
          try {
            await fetch('/api/submit-flag', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ level: '2.1', flag: data.ghost_token }),
            });
            // Refresh session after successful submission
            await update();
          } catch (err) {
            console.error('Submission error:', err);
          }
        }
      }
    } catch (err: any) {
      setError(err?.message ?? "Network error");
    } finally {
      setLoading(false);
    }
  }

  // Show loading while checking access
  if (isChecking || !canAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-hero">
        <div className="text-cyan-400 text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden px-6 py-12">
      {/* visual layer */}
      <AuroraBackground intensity="high" speed={1} showParticles />

      {/* subtle grid overlay */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          background:
            "linear-gradient(to right, hsl(var(--grid-color)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--grid-color)) 1px, transparent 1px)",
          backgroundSize: "4rem 4rem",
        }}
      />

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-20 w-full max-w-4xl"
      >
        <LevelCard>
          <header className="mb-6">
            <p className="text-base text-cyan-300 font-semibold mb-2">
              📖 ACT 2: The Deep Dive
            </p>

            <h1
              className="text-3xl md:text-4xl font-extrabold mb-3"
              style={{
                background: "linear-gradient(90deg,#00fff8,#8b5cff,#00eaff)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Level 2.1 — The Ghost Admin
            </h1>

            <div className="space-y-3 text-foreground/90 max-w-2xl">
              <p className="text-sm">
                Congratulations, investigator. You've breached NebulaCorp's outer defenses and
                exposed critical vulnerabilities in their client-side security.
              </p>

              <p className="text-sm">
                Now you're inside their{" "}
                <span className="text-primary font-semibold">User Management System</span>.
                The system grants you access to Profile ID{" "}
                <span className="font-mono text-yellow-300">1001</span>
                {" "}— a basic user account with limited privileges.
              </p>

              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 my-2">
                <p className="text-red-300 text-xs font-semibold mb-1">🎯 MISSION OBJECTIVE:</p>
                <p className="text-foreground/70 text-xs">
                  Somewhere in this system lurks the{" "}
                  <span className="text-yellow-300 font-semibold">administrator account</span>
                  {" "}with elevated privileges. Find it. Extract the access token.
                </p>
              </div>

              <p className="text-xs text-foreground/60 italic">
                <span className="text-cyan-400">⚠️ Warning:</span> Not every profile with "admin"
                in the title is what you're looking for. This system is filled with decoys...
              </p>
            </div>
          </header>

          {/* Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end mb-6">
            <div className="md:col-span-2 flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-xs text-foreground/60 mb-1">Profile ID</label>
                <input
                  aria-label="Profile ID"
                  type="number"
                  value={inputId}
                  onChange={(e) => setInputId(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && inputId) loadProfile(Number(inputId));
                  }}
                  placeholder="e.g., 1001"
                  className="w-full p-3 rounded-lg bg-black/50 border border-primary/30 text-white font-mono outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <motion.div whileTap={btnTap}>
                <Button
                  onClick={() => inputId && loadProfile(Number(inputId))}
                  disabled={!inputId || loading}
                  className="bg-primary px-5 py-3 text-black font-bold"
                >
                  {loading ? "SCANNING..." : "SEARCH"}
                </Button>
              </motion.div>
            </div>

            <div className="flex justify-start md:justify-end">
              <motion.div whileTap={btnTap}>
                <Button
                  onClick={() => loadProfile(userId)}
                  disabled={loading}
                  className="bg-transparent border border-primary/30 text-primary px-4 py-3"
                >
                  My Profile
                </Button>
              </motion.div>
            </div>
          </div>

          {/* Terminal */}
          <Terminal
            loading={loading}
            profile={profile}
            error={error}
            hasSearched={hasSearched}
          />

          {/* Footer actions */}
          <div className="mt-6 flex justify-between items-center">
            <div className="text-xs text-foreground/60">Investigate the system — anomalies are the key.</div>

            <div>
              {profile?.ghost_token ? (
                <motion.div whileTap={btnTap}>
                  <Button
                    onClick={() => router.push("/levels/2.2")}
                    className="bg-gradient-to-r from-lime-400 to-cyan-400 text-black font-bold px-6 py-3"
                  >
                    Continue
                  </Button>
                </motion.div>
              ) : (
                <div />
              )}
            </div>
          </div>
        </LevelCard>
      </motion.div>
    </section>
  );
}
