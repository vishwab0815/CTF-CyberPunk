"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ShieldAlert, Terminal as TerminalIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import "@/app/styles/cyber-global.css";

/* Simple JS guard — players must delete this in DevTools */
function jsGuard(domain: string): boolean {
  if (domain === "dns-rebinding-test.internal") {
    alert("Blocked by JavaScript security policy.");
    return true;
  }
  return false;
}

export default function LevelOneThree() {
  const router = useRouter();

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
        await appendTypedLine("[TIP] Open DevTools → Sources → remove jsGuard() check.");
      })();
    }
  }, [mounted]);

  // Submit handler
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const domain = input.trim();
    if (!domain || isTyping) return;

    if (jsGuard(domain)) return;

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
      setFlagFound(true);
      setTimeout(() => router.push("/completion/level-1-completed"), 1500);
    }
  };

  // HTML comment injection (safe)
  const htmlComment = `
    <!--
      Dev Note:
      JS Guard enabled for domain:
      dns-rebinding-test.internal
      TODO: Move security logic to backend.
    -->
  `;

  /* 
  ============================================================
  RETURN SECTION (Hydration-safe)
  ============================================================
  */

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

            <h2
              className="text-3xl font-semibold mb-4"
              style={{
                background: "linear-gradient(90deg,#7efcff,#a86bff)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              The JavaScript Guard
            </h2>

            <p className="text-foreground/80 mb-3">
              The Patches Team added a <span className="text-primary font-bold">JavaScript check</span> that blocks your request if the exploit domain is detected.
            </p>

            <p className="text-foreground/70 text-sm">
              Your task: Open DevTools → Sources, remove or modify the <strong>jsGuard</strong> function.
            </p>

            <div className="mt-3 font-mono text-primary bg-black/40 px-3 py-2 rounded-lg border border-primary/30 w-fit">
              dns-rebinding-test.internal
            </div>

            <Button
              variant="outline"
              className="mt-6"
              onClick={() => navigator.clipboard.writeText("dns-rebinding-test.internal")}
            >
              Copy Exploit
            </Button>
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
