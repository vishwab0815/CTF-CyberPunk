"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ShieldAlert, Terminal as TerminalIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useLevelAccess } from "@/lib/useLevelAccess";
import { useSession } from "next-auth/react";
import "@/app/styles/cyber-global.css";

export default function LevelOneTwo() {
  const router = useRouter();
  const { canAccess, isChecking } = useLevelAccess('1.2');
  const { update } = useSession();

  // Input (maxlength trap)
  const [input, setInput] = useState("");

  // Terminal log storage
  const logRef = useRef<string[]>([]);
  const [logLines, setLogLines] = useState<string[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  const [flagFound, setFlagFound] = useState(false);

  const terminalRef = useRef<HTMLDivElement | null>(null);

  // Injected View Source HTML comment (subtle hint)
  const htmlComment = `
    <!--
      Security patch v1.2 applied: client-side input validation
      Max input length: 15 characters enforced at UI layer

      Test domain: secure-testing-environment-27.internal
      Note: Exceeds maxlength constraint - verify server-side validation works
    -->
  `;

  // Auto-scroll terminal on new logs
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logLines]);

  // Animated typing effect
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
      await new Promise((r) => setTimeout(r, 10 + Math.random() * 10));
    }

    setIsTyping(false);
  };

  // Main handler (single correct one)
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isTyping) return;

    const domain = input.trim();
    setInput("");

    await appendTypedLine(`> Querying ${domain} ...`);

    try {
      const res = await fetch("/api/levels/1.2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain }),
      });

      const data = await res.json();
      const output = String(data?.result ?? "");

      const lines = output.split("\n").filter(Boolean);
      for (const ln of lines) {
        // eslint-disable-next-line no-await-in-loop
        await appendTypedLine(ln);
      }

      // Detect flag and submit
      if (output.includes("flag{")) {
        const flagMatch = output.match(/flag\{[^}]+\}/);
        if (flagMatch) {
          const flag = flagMatch[0];
          try {
            const submitRes = await fetch('/api/submit-flag', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ level: '1.2', flag }),
            });
            const submitData = await submitRes.json();

            // Debug logging
            console.log('Submit response:', submitData);

            if (submitData.correct) {
              setFlagFound(true);

              // Refresh the session to update JWT token with new currentLevel
              await update();

              // Use completionPage if available, otherwise use nextLevel
              const redirectPath = submitData.completionPage || `/levels/${submitData.nextLevel}`;
              console.log('Redirecting to:', redirectPath);
              setTimeout(() => router.push(redirectPath), 1600);
            } else if (submitData.error) {
              console.error('Submission failed:', submitData.error);
              await appendTypedLine(`> Error: ${submitData.error}`);
            } else {
              console.log('Flag incorrect, attempts:', submitData.attempts);
              await appendTypedLine(`> Incorrect flag. Attempts: ${submitData.attempts}`);
            }
          } catch (err) {
            console.error('Submission error:', err);
            await appendTypedLine(`> Network error: ${err}`);
          }
        }
      }
    } catch (err: any) {
      await appendTypedLine(`> Error: ${err?.message ?? "unknown"}`);
    }
  };

  // Initial terminal boot lines
  useEffect(() => {
    if (logRef.current.length === 0) {
      (async () => {
        await appendTypedLine("[SYSTEM] Patches v1.2 deployed — validation active.");
      })();
    }
  }, []);

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
              Level 1.2 — The 15-Character Ruler
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
              📖 Chapter 2: The Client Trap
            </p>

            <p className="text-base text-foreground/90 mb-4">
              After exposing the legacy DNS systems, you've caught NebulaCorp's attention.
              The development team rushed to implement a{" "}
              <span className="text-primary font-semibold">"security patch"</span>
              {" "}to prevent unauthorized access.
            </p>

            <p className="text-foreground/80 text-sm mb-3">
              Their solution? Add a <span className="text-yellow-400 font-mono">maxlength=15</span> attribute
              to the input field. That should stop any attempts to query suspicious domains... right?
            </p>

            <p className="text-foreground/70 text-sm mb-3">
              Intelligence suggests that NebulaCorp has internal test domains that exceed normal
              naming conventions. Some are quite long — far beyond the 15-character "security" limit
              they've imposed.
            </p>

            <p className="text-foreground/60 text-xs italic">
              <span className="text-cyan-400">Your Mission:</span> Investigate whether client-side
              restrictions can truly protect against server-side vulnerabilities. The page source
              might contain useful information...
            </p>
          </motion.div>

          {/* CONSOLE */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="bg-black/40 border border-primary/20 rounded-2xl p-6 backdrop-blur-lg shadow-[0_0_30px_rgba(168,107,255,0.1)]"
          >
            {/* input row */}
            <form onSubmit={(e) => void handleSubmit(e)} className="flex gap-3 items-center mb-4">
              <div className="relative flex-1">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  maxLength={15} // TRAP
                  disabled={isTyping}
                  className="w-full p-3 rounded-xl bg-black/40 border border-primary/20 text-primary-foreground font-mono focus:ring-2 focus:ring-primary/40"
                />

                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs bg-black/30 px-2 py-1 border border-primary/20 rounded text-foreground/70">
                  max 15
                </div>
              </div>

              <Button className="bg-primary" disabled={isTyping}>
                <TerminalIcon className="w-4 h-4 mr-2" />
                Query
              </Button>
            </form>

            {/* terminal */}
            <div
              ref={terminalRef}
              className="rounded-xl bg-[#071014]/70 border border-primary/10 p-4 h-[320px] overflow-auto font-mono text-[#00ff41] text-sm"
            >
              {logLines.length === 0 && (
                <div className="opacity-70">[Ready] Client patch active — maxlength enforced.</div>
              )}

              {logLines.map((ln, i) => (
                <div key={i} className="leading-6 break-words">
                  {ln}
                </div>
              ))}
            </div>

            {flagFound && (
              <div className="mt-4 text-green-400 font-semibold text-center">
                Flag found — loading next mission...
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
