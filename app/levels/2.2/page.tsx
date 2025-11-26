"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import AuroraBackground from "@/components/visuals/AuroraBackground";
import { Button } from "@/components/ui/button";
import LevelCard from "@/components/LevelCard";
import Terminal from "@/components/Terminal";
import { btnTap } from "@/lib/animation";
import { useRouter } from "next/navigation";
import { useLevelAccess } from "@/lib/useLevelAccess";
import { useSession } from "next-auth/react";

export default function LevelTwoTwoPage() {
  const router = useRouter();
  const { canAccess, isChecking } = useLevelAccess('2.2');
  const { update } = useSession();

  // Ensure proper client-side mounting
  const [mounted, setMounted] = useState(false);

  // Default identity token
  const defaultToken = btoa(JSON.stringify({ user_id: 1001, role: "basic" }));
  const [token, setToken] = useState<string>(defaultToken);

  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  async function submitToken() {
    setLoading(true);
    setResponse(null);

    try {
      const res = await fetch("/api/levels/2.2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();
      setResponse(data);

      // Auto-submit if admin_key found
      if (data.admin_key) {
        try {
          await fetch('/api/submit-flag', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ level: '2.2', flag: data.admin_key }),
          });
          // Refresh session after successful submission
          await update();
        } catch (err) {
          console.error('Submission error:', err);
        }
      }
    } catch (err: any) {
      setResponse({ error: err?.message ?? "Unknown error" });
    } finally {
      setLoading(false);
    }
  }

  // Show loading while checking access or mounting
  if (!mounted || isChecking || !canAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-hero">
        <div className="text-cyan-400 text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden px-6 py-12 bg-gradient-hero">
      <AuroraBackground intensity="high" speed={1} showParticles />

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-20 w-full max-w-4xl"
      >
        <LevelCard>
          <header className="mb-6">
            <p className="text-base text-cyan-300 font-semibold mb-2">
              📖 Chapter 5: The Masquerade
            </p>

            <h1
              className="text-3xl md:text-4xl font-extrabold mb-3"
              style={{
                background: "linear-gradient(90deg,#00fff8,#8b5cff,#00eaff)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Level 2.2 — The Forged Identity
            </h1>

            <div className="space-y-3 text-foreground/90 max-w-2xl">
              <p className="text-sm">
                Excellent work, investigator! You've discovered the{" "}
                <span className="text-primary font-semibold">Ghost Administrator</span> account
                and obtained the access token. The system's secrets are within reach.
              </p>

              <p className="text-sm">
                But there's something peculiar... NebulaCorp's authentication system generates
                identity tokens{" "}
                <span className="text-yellow-300 font-semibold">on the client-side</span>.
                That means the browser creates the token, not the server.
              </p>

              <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3 my-2">
                <p className="text-purple-300 text-xs font-semibold mb-1">🎭 FINAL CHALLENGE:</p>
                <p className="text-foreground/70 text-xs">
                  Your current token identifies you as <span className="font-mono text-yellow-300">user_id: 1001</span>
                  {" "}with <span className="font-mono text-red-300">role: "basic"</span>.
                  But if tokens are generated in your browser...
                  <span className="text-primary font-semibold"> who controls them?</span>
                </p>
              </div>

              <p className="text-xs text-foreground/60 italic">
                <span className="text-cyan-400">Your Mission:</span> Forge a new identity token
                that grants you administrator privileges. Infiltrate the system completely.
              </p>

              <p className="text-xs text-foreground/50 italic mt-1">
                Remember: Identities can be... rewritten.
              </p>
            </div>
          </header>

          {/* Token Editor */}
          <div className="mb-4">
            <label className="text-xs text-foreground/60">Your Identity Token</label>
            <textarea
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full h-32 bg-black/50 border border-primary/40 text-primary p-3 rounded-lg font-mono text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <motion.div whileTap={btnTap}>
            <Button
              onClick={submitToken}
              disabled={loading}
              className="bg-primary text-black font-bold px-6 py-3"
            >
              {loading ? "VERIFYING..." : "SEND TOKEN"}
            </Button>
          </motion.div>

          {/* Terminal Output */}
          <Terminal
            loading={loading}
            error={response?.error}
            profile={response}
            hasSearched={true}
          />

          {/* Continue Button */}
          {response?.admin === true && (
            <div className="mt-6 text-right">
              <motion.div whileTap={btnTap}>
                <Button
                  onClick={() => router.push("/completion/level-2-completed")}
                  className="bg-gradient-to-r from-lime-400 to-cyan-400 text-black font-bold px-6 py-3"
                >
                  Continue
                </Button>
              </motion.div>
            </div>
          )}
        </LevelCard>
      </motion.div>
    </section>
  );
}
