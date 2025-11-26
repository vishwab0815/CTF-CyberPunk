"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ShieldAlert, Terminal as TerminalIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useLevelAccess } from "@/lib/useLevelAccess";
import { useSession } from "next-auth/react";
import "@/app/styles/cyber-global.css";

// Security validation (exposed to window for "bypass")
function jsGuard(domain: string): boolean {
  if (domain === "dns-rebinding-test.internal") {
    alert("Blocked by JavaScript security policy.");
    return true;
  }
  return false;
}

// Expose to global scope so it can be "hacked"
if (typeof window !== 'undefined') {
  (window as any).jsGuard = jsGuard;
}

export default function LevelOneThree() {
  const router = useRouter();
  const { canAccess, isChecking } = useLevelAccess('1.3');
  const { update } = useSession();

  // HYDRATION-SAFE MOUNT FLAG
  const [mounted, setMounted] = useState(false);

  // Other hooks (these MUST stay above any condition!)
  const [input, setInput] = useState("");
  const [logLines, setLogLines] = useState<string[]>([]);
  const logRef = useRef<string[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [flagFound, setFlagFound] = useState(false);
  const terminalRef = useRef<HTMLDivElement | null>(null);

  // Set mounted on client
  useEffect(() => {
    setMounted(true);
  }, []);

  // Scroll terminal
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
      await new Promise((r) => setTimeout(r, 8 + Math.random() * 16));
    }

    setIsTyping(false);
  };

  // On-load terminal boot messages
  useEffect(() => {
    if (mounted) {
      (async () => {
        await appendTypedLine("[SYSTEM] JavaScript Guard v1.0 Activated.");
      })();
    }
  }, [mounted]);

  // Submit handler
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const domain = input.trim();
    if (!domain || isTyping) return;

    // Use window.jsGuard to allow console override
    if ((window as any).jsGuard(domain)) return;

    setInput("");
    await appendTypedLine(`> Querying ${domain} ...`);

    const res = await fetch("/api/levels/1.3", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain }),
    });

    const data = await res.json();
    const output = String(data?.result ?? "");

    for (const ln of output.split("\n").filter(Boolean)) {
      // eslint-disable-next-line no-await-in-loop
      await appendTypedLine(ln);
    }

    if (output.includes("flag{")) {
      const flagMatch = output.match(/flag\{[^}]+\}/);
      if (flagMatch) {
        const flag = flagMatch[0];
        try {
          const submitRes = await fetch('/api/submit-flag', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ level: '1.3', flag }),
          });
          const submitData = await submitRes.json();
          if (submitData.correct) {
            setFlagFound(true);
            // Refresh session
            await update();
            // Use completionPage if available, otherwise use nextLevel
            const redirectPath = submitData.completionPage || `/levels/${submitData.nextLevel}`;
            setTimeout(() => router.push(redirectPath), 1500);
          }
        } catch (err) {
          console.error('Submission error:', err);
        }
      }
    }
  };

  // HTML comment injection (more subtle)
  const htmlComment = `
    <!--
      Frontend validation layer active
      Consider migrating critical checks server-side
    -->
  `;

  /*
  ============================================================
  RETURN SECTION (Hydration-safe)
  ============================================================
  */

  // Show loading while checking access
  if (isChecking || !canAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-hero">
        <div className="text-cyan-400 text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <section className="relative min-h-screen w-full flex items-center justify-center p-6 overflow-hidden">
      {/* Background visuals */}
      <div className="absolute inset-0 bg-gradient-hero" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--grid-color))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--grid-color))_1px,transparent_1px)] bg-[size:5rem_5rem]" />

      {/* Glow orbs */}
      <motion.div
        className="absolute -left-32 top-10 w-[500px] h-[500px] rounded-full blur-[140px]"
        style={{ background: "radial-gradient(circle,#0ff3,transparent 70%)" }}
        animate={{ y: [0, 12, 0] }}
        transition={{ duration: 8, repeat: Infinity }}
      />

      <motion.div
        className="absolute -right-32 bottom-10 w-[450px] h-[450px] rounded-full blur-[140px]"
        style={{ background: "radial-gradient(circle,#a6f3ff33,transparent 70%)" }}
        animate={{ y: [0, -12, 0] }}
        transition={{ duration: 9, repeat: Infinity }}
      />

      {/* Inject HTML comment */}
      <div dangerouslySetInnerHTML={{ __html: htmlComment }} />

      <div className="relative z-10 container mx-auto max-w-5xl">
        {/* HEADER */}
        <div className="flex items-center gap-4 mb-12">
          <div className="px-3 py-2 rounded-full bg-card/40 border border-primary/20 backdrop-blur-md">
            <ShieldAlert className="w-5 h-5 text-primary animate-glow-pulse" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">NebulaCorp Security Labs</div>
            <h1
              className="text-4xl font-bold"
              style={{
                background: "linear-gradient(90deg,#08f9ff,#a86bff)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Level 1.3 — The JavaScript Guard
            </h1>
          </div>
        </div>

        {/* TWO COLUMNS */}
        <div className="grid lg:grid-cols-2 gap-10">
          {/* STORY PANEL */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: mounted ? 1 : 0, y: mounted ? 0 : 14 }}
            transition={{ duration: 0.6 }}
            className="bg-black/40 p-6 rounded-2xl border border-primary/20 backdrop-blur-lg"
          >
            <div className="text-xs text-primary uppercase mb-2">Mission Brief</div>

            <p className="text-base text-foreground/90 font-semibold text-cyan-300 mb-3">
              📖 Chapter 3: The JavaScript Illusion
            </p>

            <p className="text-base text-foreground/90 mb-4">
              NebulaCorp's security team is frustrated. After your previous exploits, they've
              deployed what they call their{" "}
              <span className="text-primary font-semibold">"unbreakable defense"</span>
              {" "}— a JavaScript validation layer.
            </p>

            <p className="text-foreground/80 text-sm mb-3">
              This time, a <span className="text-yellow-400 font-mono">jsGuard()</span> function
              actively blocks suspicious domains before they even reach the server. Try querying
              <span className="font-mono text-red-300"> "dns-rebinding-test.internal"</span>
              {" "}and watch it get intercepted.
            </p>

            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3 my-3">
              <p className="text-purple-300 text-xs font-semibold mb-1">🛡️ SECURITY LAYER DETECTED:</p>
              <p className="text-foreground/70 text-xs">
                JavaScript Guard v1.0 is active and monitoring all domain queries.
                The development team believes this is foolproof since it runs
                {" "}<span className="text-yellow-300">"before the user can do anything."</span>
              </p>
            </div>

            <p className="text-foreground/60 text-xs italic">
              <span className="text-cyan-400">Your Mission:</span> JavaScript runs in the browser...
              which means it runs on <span className="text-primary font-semibold">your machine</span>.
              Can you find a way to take control?
            </p>
          </motion.div>

          {/* TERMINAL PANEL */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: mounted ? 1 : 0, y: mounted ? 0 : 14 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="bg-black/40 p-6 rounded-2xl border border-primary/20 backdrop-blur-lg"
          >
            <form onSubmit={(e) => void handleSubmit(e)} className="flex gap-3 mb-4">
              <div className="relative flex-1">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={isTyping}
                  className="w-full p-3 rounded-xl bg-black/40 border border-primary/20 text-primary-foreground font-mono"
                />
              </div>

              <Button className="bg-primary" disabled={isTyping}>
                <TerminalIcon className="w-4 h-4 mr-2" />
                Lookup
              </Button>
            </form>

            {/* TERMINAL */}
            <div
              ref={terminalRef}
              className="rounded-xl bg-[#071014]/70 border border-primary/10 p-4 h-[320px] overflow-auto font-mono text-[#00ff41] text-sm"
            >
              {logLines.map((ln, i) => (
                <div key={i} className="leading-6 break-words">
                  {ln}
                </div>
              ))}
            </div>

            {flagFound && (
              <div className="mt-4 text-green-400 font-semibold text-center">
                Flag found — loading next mission…
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
