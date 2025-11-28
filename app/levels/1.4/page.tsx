"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ShieldAlert, Terminal as TerminalIcon, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useLevelAccess } from "@/lib/useLevelAccess";
import { useSession } from "next-auth/react";
import "@/app/styles/cyber-global.css";

export default function LevelOneFour() {
  const router = useRouter();
  const { canAccess, isChecking } = useLevelAccess('1.4');
  const { update } = useSession();

  const [flagInput, setFlagInput] = useState("");
  const [flagFound, setFlagFound] = useState(false);
  const [submitResult, setSubmitResult] = useState<string | null>(null);
  const [logLines, setLogLines] = useState<string[]>([]);
  const logRef = useRef<string[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const terminalRef = useRef<HTMLDivElement | null>(null);

  // HTML comment with hidden endpoint clue
  const htmlComment = `
    <!--
      🔒 INTERNAL SECURITY AUDIT LOG 🔒

      System endpoints discovered during investigation:
      - /api/levels/1.1 (DNS Query System)
      - /api/levels/1.2 (Validation System)
      - /api/levels/1.3 (JavaScript Guard)
      - /api/levels/1.4 (Legacy Admin Panel - DECOMMISSIONED)

      TODO: Remove reference to legacy admin endpoint before production!
      Note: Endpoint still responds to requests despite being marked as deprecated.
    -->
  `;

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logLines]);

  // Typing animation
  const appendTypedLine = async (line: string) => {
    setIsTyping(true);

    logRef.current.push("");
    const idx = logRef.current.length - 1;

    let current = "";
    for (let i = 0; i < line.length; i++) {
      current += line[i];
      logRef.current[idx] = current;
      setLogLines([...logRef.current]);
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 8 + Math.random() * 12));
    }

    setIsTyping(false);
  };

  // Initial boot messages
  useEffect(() => {
    if (logRef.current.length === 0) {
      (async () => {
        await appendTypedLine("[SYSTEM] Endpoint Discovery Tool v2.0 initialized.");
        await appendTypedLine("[INFO] Scanning NebulaCorp API architecture...");
        await new Promise((r) => setTimeout(r, 800));
        await appendTypedLine("[SCAN] Found: /api/levels/1.1 - Active");
        await appendTypedLine("[SCAN] Found: /api/levels/1.2 - Active");
        await appendTypedLine("[SCAN] Found: /api/levels/1.3 - Active");
        await new Promise((r) => setTimeout(r, 600));
        await appendTypedLine("[WARNING] Scan incomplete. Some endpoints may be hidden from public routes.");
        await appendTypedLine("[INFO] Check system documentation for references to undiscovered endpoints...");
      })();
    }
  }, []);

  // Submit flag
  const handleFlagSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!flagInput.trim()) return;

    try {
      const res = await fetch('/api/submit-flag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level: '1.4', flag: flagInput }),
      });

      const data = await res.json();

      if (data.correct) {
        setSubmitResult("✅ Flag correct! Level 1 completed. Advancing...");
        setFlagFound(true);

        // Refresh session to update JWT token
        await update();

        // Use completionPage from API response
        const redirectPath = data.completionPage || `/levels/${data.nextLevel}` || '/';
        setTimeout(() => router.push(redirectPath), 2000);
      } else {
        setSubmitResult("❌ Incorrect flag. Keep investigating...");
      }
    } catch (err) {
      setSubmitResult("❌ Error submitting flag");
    }
  };

  // Show loading while checking access
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-hero">
        <div className="text-cyan-400 text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden p-6">
      {/* Background grid */}
      <div className="absolute inset-0 bg-gradient-hero" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--grid-color))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--grid-color))_1px,transparent_1px)] bg-[size:5rem_5rem]" />

      {/* Glowing background elements */}
      <motion.div
        className="absolute -left-32 top-10 w-[500px] h-[500px] rounded-full blur-[140px]"
        style={{ background: "radial-gradient(circle,#08f9ff33,transparent 70%)" }}
        animate={{ y: [0, 14, 0] }}
        transition={{ duration: 8, repeat: Infinity }}
      />

      <motion.div
        className="absolute -right-32 bottom-10 w-[450px] h-[450px] rounded-full blur-[130px]"
        style={{ background: "radial-gradient(circle,#a86bff33,transparent 70%)" }}
        animate={{ y: [0, -12, 0] }}
        transition={{ duration: 9, repeat: Infinity }}
      />

      {/* Inject hint comment */}
      <div dangerouslySetInnerHTML={{ __html: htmlComment }} />

      {/* Main container */}
      <div className="relative z-10 container mx-auto max-w-5xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-10">
          <div className="px-3 py-2 rounded-full bg-card/50 border border-primary/20 backdrop-blur-sm">
            <ShieldAlert className="w-5 h-5 text-primary animate-glow-pulse" />
          </div>
          <div>
            <div className="text-sm text-muted-foreground">NebulaCorp Security Labs</div>
            <h1
              className="text-4xl font-bold"
              style={{
                background: "linear-gradient(90deg,#08f9ff,#a86bff)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Level 1.4 — The Hidden Gateway
            </h1>
          </div>
        </div>

        {/* Two-column layout */}
        <div className="grid lg:grid-cols-2 gap-10">
          {/* STORY */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="bg-black/40 border border-primary/20 rounded-2xl p-6 backdrop-blur-lg shadow-[0_0_30px_rgba(0,255,255,0.1)]"
          >
            <div className="text-xs uppercase tracking-wider text-primary mb-3">
              Mission Brief
            </div>

            <p className="text-base text-foreground/90 font-semibold text-cyan-300 mb-3">
              📖 Chapter 4: The Hidden Gateway
            </p>

            <p className="text-base text-foreground/90 mb-4">
              Your investigation has uncovered a pattern — NebulaCorp's security relies on
              obscurity, not proper access controls. Their developers believe that if something
              is hidden, it's secure.
            </p>

            <p className="text-foreground/80 text-sm mb-3">
              You've breached their DNS systems, bypassed client-side validation, and disabled
              JavaScript guards. But there's more... Your intelligence suggests the existence of
              <span className="text-yellow-400 font-semibold"> hidden API endpoints</span>
              {" "}that weren't supposed to be accessible to external auditors.
            </p>

            <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3 my-3">
              <p className="text-orange-300 text-xs font-semibold mb-1">🔍 INVESTIGATION NOTES:</p>
              <p className="text-foreground/70 text-xs">
                Developers often leave comments in code referencing internal systems. They assume
                no one will look. Your scanner has detected three active endpoints... but
                intelligence suggests there may be a fourth — a legacy admin panel that should
                have been decommissioned.
              </p>
            </div>

            <p className="text-foreground/60 text-xs italic">
              <span className="text-cyan-400">Your Mission:</span> Discover the hidden endpoint.
              Extract its secrets. Prove that obscurity is not security.
            </p>
          </motion.div>

          {/* CONSOLE + FLAG SUBMISSION */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="bg-black/40 border border-primary/20 rounded-2xl p-6 backdrop-blur-lg shadow-[0_0_30px_rgba(168,107,255,0.1)]"
          >
            {/* Terminal */}
            <div
              ref={terminalRef}
              className="rounded-xl bg-[#071014]/70 border border-primary/10 p-4 h-[280px] overflow-auto font-mono text-[#00ff41] text-sm mb-4"
            >
              {logLines.map((ln, i) => (
                <div key={i} className="leading-6 break-words">
                  {ln}
                </div>
              ))}
            </div>

            {/* Flag submission form */}
            <form onSubmit={handleFlagSubmit} className="space-y-3">
              <div>
                <label className="block text-xs text-foreground/60 mb-2 flex items-center gap-2">
                  <Search className="w-3 h-3" />
                  Submit Flag
                </label>
                <input
                  value={flagInput}
                  onChange={(e) => setFlagInput(e.target.value)}
                  placeholder="flag{...}"
                  className="w-full p-3 rounded-xl bg-black/40 border border-primary/20 text-primary-foreground font-mono focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-primary"
                disabled={!flagInput.trim() || flagFound}
              >
                <TerminalIcon className="w-4 h-4 mr-2" />
                Submit Flag
              </Button>

              {submitResult && (
                <div
                  className={`text-center text-sm font-semibold ${
                    submitResult.includes("✅") ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {submitResult}
                </div>
              )}
            </form>

            {flagFound && (
              <div className="mt-4 text-green-400 font-semibold text-center text-sm">
                🎉 Level 1 Complete! Redirecting...
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
