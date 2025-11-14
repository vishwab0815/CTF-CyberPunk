"use client";

import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Terminal as TerminalIcon,
  ShieldAlert,
  ArrowRight,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import "@/app/styles/cyber-global.css";

type ApiResponse = { flagPart: string; hint?: string };

// Normalize for validation
const normalize = (s: string) => s.trim().toLowerCase();

export default function LevelOneOne() {
  const router = useRouter();

  // Input state
  const [input, setInput] = useState("");

  // Terminal logs stable via ref
  const logRef = useRef<string[]>([]);
  const [logLines, setLogLines] = useState<string[]>([]);

  // Collected flag fragments
  const [collectedParts, setCollectedParts] = useState<string[]>([]);

  // Typing lock
  const [isTyping, setIsTyping] = useState(false);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalInput, setModalInput] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const terminalRef = useRef<HTMLDivElement | null>(null);

  // HTML comment for View Source
  const htmlComment = `
    <!--
      TODO (jules-dev):
      DNSSEC still breaks for 'flag-archive.internal'.
      Fix before production deployment.
    -->
  `;

  // Autoscroll
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logLines, modalOpen]);

  // Typing animation
  const appendTypedLine = async (line: string) => {
    setIsTyping(true);

    logRef.current.push(""); 
    const idx = logRef.current.length - 1;

    let curr = "";
    for (let i = 0; i < line.length; i++) {
      curr += line[i];
      logRef.current[idx] = curr;
      setLogLines([...logRef.current]);
      await new Promise((res) => setTimeout(res, 10 + Math.random() * 14));
    }

    setIsTyping(false);
  };

  // Query handler
  const handleQuery = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isTyping) return;

    const domain = input.trim();
    setInput("");

    await appendTypedLine(`> Querying ${domain} ...`);

    try {
      const rsp = await fetch("/api/levels/1.1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain }),
      });

      const data: ApiResponse = await rsp.json();

      await appendTypedLine(`> ${data.flagPart}`);

      // store part
      if (
        data.flagPart &&
        !data.flagPart.toLowerCase().startsWith("no") &&
        !data.flagPart.toLowerCase().startsWith("error")
      ) {
        setCollectedParts((prev) => {
          if (prev.includes(data.flagPart)) return prev;
          return [...prev, data.flagPart];
        });
      }

      if (data.hint) {
        await appendTypedLine(`(hint) ${data.hint}`);
      }
    } catch (err: any) {
      await appendTypedLine(`> Error: ${err?.message ?? "unknown"}`);
    }
  };

  // Auto-open modal when 3 parts collected
  useEffect(() => {
    if (collectedParts.length === 3) {
      setTimeout(() => setModalOpen(true), 500);
    }
  }, [collectedParts]);

  const expectedFlag = collectedParts.join("");

  // Submit modal
  const handleModalSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    setModalError(null);

    const user = normalize(modalInput);
    const expected = normalize(expectedFlag);

    if (!user) {
      setModalError("Please enter the reconstructed flag.");
      return;
    }

    if (user === expected) {
      setSubmitSuccess(true);

      void appendTypedLine(`> Flag submitted: ${modalInput}`);
      void appendTypedLine("> Flag correct. Level complete.");

      setTimeout(() => {
        router.push("/levels/1.2");
      }, 1500);

    } else {
      setModalError("Incorrect flag. Check fragments and try again.");
      void appendTypedLine("> Flag submitted: " + modalInput);
      void appendTypedLine("> Result: Incorrect flag.");
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalError(null);
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden p-6">
      {/* BG */}
      <div className="absolute inset-0 bg-gradient-hero" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--grid-color))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--grid-color))_1px,transparent_1px)] bg-[size:4rem_4rem]" />

      <div dangerouslySetInnerHTML={{ __html: htmlComment }} />

      <div className="relative z-10 container mx-auto max-w-4xl">
        {/* Badge */}
        <div className="flex justify-center mb-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card/50 border border-primary/20">
            <ShieldAlert className="w-4 h-4 text-primary animate-glow-pulse" />
            <span className="text-sm text-muted-foreground">
              Level 1.1 — The Forgotten Sticky Note
            </span>
          </div>
        </div>

        {/* STORY BLOCK */}
        <div className="text-center mb-10">
          <h1
            className="text-5xl font-bold mb-6 tracking-tight drop-shadow-lg"
            style={{
              background:
                "linear-gradient(to right, hsl(180 100% 50%), hsl(150 100% 45%), hsl(280 100% 60%))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            DNS Archive Breach
          </h1>

          <div className="mx-auto max-w-3xl bg-black/40 border border-primary/20 backdrop-blur-md rounded-xl p-6 shadow-[0_0_25px_rgba(0,255,255,0.2)]">
            <div className="flex flex-wrap justify-center gap-2 mb-4">
              <span className="px-3 py-1 text-xs uppercase tracking-wider bg-primary/20 text-primary border border-primary/30 rounded-md">
                Mission Briefing
              </span>
              <span className="px-3 py-1 text-xs uppercase tracking-wider bg-accent/20 text-accent border border-accent/30 rounded-md">
                Operation: Level 1.1
              </span>
            </div>

            <div className="grid gap-4 text-foreground/80 text-sm leading-relaxed">
              <p className="text-base text-foreground/90">
                Welcome, analyst. You’ve been assigned to evaluate NebulaCorp’s newly deployed
                <span className="text-primary font-semibold"> DNS Integrity Auditor</span>.
              </p>

              <ul className="text-left mx-auto max-w-md grid gap-2">
                <li className="flex items-start gap-2">
                  <span className="text-primary">▹</span> Engineers pushed it live without full
                  security review.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">▹</span> Rumor says a developer left clues hidden
                  inside the page source.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">▹</span> Query internal domains to retrieve flag
                  fragments.
                </li>
              </ul>

              <div className="h-px bg-primary/20 my-3 rounded-full" />

              <p className="text-foreground/80 italic">
                Objective: uncover the trail, retrieve fragments, reconstruct the flag.
              </p>
            </div>
          </div>
        </div>

        {/* INPUT */}
        <form
          onSubmit={(e) => void handleQuery(e)}
          className="mb-6 flex gap-3 items-center"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isTyping}
            className="flex-1 p-3 rounded-md bg-black/40 border border-primary/20 text-primary-foreground font-medium"
          />

          <Button type="submit" disabled={isTyping} className="bg-primary">
            <TerminalIcon className="w-4 h-4 mr-2" />
            Query
          </Button>
        </form>

        {/* TERMINAL */}
        <div
          ref={terminalRef}
          className="p-6 rounded-xl font-mono text-sm bg-[#0d0d0d]/80 border border-primary/20 min-h-[260px] max-h-[420px] overflow-auto"
        >
          {logLines.length === 0 && (
            <div className="text-[#00ff41] opacity-80">
              [Ready] Awaiting domain input...
            </div>
          )}

          {logLines.map((ln, i) => (
            <div key={i} className="text-[#00ff41] leading-6 break-words">
              {ln}
            </div>
          ))}
        </div>

        {/* Fragment Preview */}
        <div className="mt-4 flex gap-3 items-center">
          {collectedParts.map((p, idx) => (
            <div
              key={idx}
              className="px-3 py-1 bg-black/50 border border-primary/20 rounded text-[#00ff41] font-mono text-xs"
            >
              {p}
            </div>
          ))}
        </div>
      </div>

      {/* MODAL */}
      <AnimatePresence>
        {modalOpen && (
          <>
            {/* DARK OVERLAY */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 z-40"
            />

            {/* CYBER HOLOGRAM CARD */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-xl p-6"
            >
              <div className="relative bg-[rgba(8,8,10,0.85)] border border-primary/20 rounded-2xl p-6 shadow-[0_10px_40px_rgba(0,255,255,0.08)] backdrop-blur-md">
                {/* CLOSE */}
                <button
                  onClick={closeModal}
                  className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* HEADER */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="px-3 py-1 bg-primary/20 text-primary rounded-md text-sm uppercase tracking-wider">
                    Flag Submission
                  </div>
                  <div className="text-sm text-foreground/80">
                    Enter the reconstructed flag
                  </div>
                </div>

                {/* FORM */}
                <form
                  onSubmit={(e) => void handleModalSubmit(e)}
                  className="grid gap-3"
                >
                  <input
                    value={modalInput}
                    onChange={(e) =>
                      setModalInput(e.target.value.toLowerCase())
                    }
                    className="w-full p-3 rounded-md bg-black/30 border border-primary/20 text-primary-foreground font-mono"
                    spellCheck={false}
                  />

                  {modalError && (
                    <div className="text-sm text-red-400">{modalError}</div>
                  )}

                  {!submitSuccess ? (
                    <div className="flex gap-3">
                      <Button type="submit" className="flex-1 bg-primary">
                        Submit
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={closeModal}
                        className="flex-none"
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <div className="text-green-400 font-semibold">
                        ✅ Correct — Level Complete
                      </div>
                      <div className="flex gap-3">
                        <Button
                          onClick={() => router.push("/levels/1.2")}
                          className="bg-primary"
                        >
                          Next Level <ArrowRight className="ml-2" />
                        </Button>
                      </div>
                    </div>
                  )}
                </form>

                <div className="mt-4 text-xs text-foreground/70 font-mono">
                  Fragments found: {collectedParts.join(" | ")}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </section>
  );
}
