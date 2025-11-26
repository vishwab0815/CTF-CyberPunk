"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Sparkles, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import "@/app/styles/cyber-global.css";

export default function Level1Completed() {
  const router = useRouter();

  return (
    <section className="relative min-h-screen w-full flex items-center justify-center overflow-hidden p-10">
      {/* Background Layers */}
      <div className="absolute inset-0 bg-gradient-hero" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--grid-color))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--grid-color))_1px,transparent_1px)] bg-[size:4rem_4rem]" />

      {/* Glow Orbs */}
      <motion.div
        className="absolute -left-20 top-1/4 w-[450px] h-[450px] rounded-full blur-[140px]"
        style={{ background: "radial-gradient(circle,#0ff3,transparent 70%)" }}
        animate={{ y: [0, 18, 0] }}
        transition={{ duration: 7, repeat: Infinity }}
      />

      <motion.div
        className="absolute -right-20 bottom-1/4 w-[450px] h-[450px] rounded-full blur-[130px]"
        style={{ background: "radial-gradient(circle,#a6f3ff33,transparent 70%)" }}
        animate={{ y: [0, -18, 0] }}
        transition={{ duration: 7, repeat: Infinity }}
      />

      {/* Success Box */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="relative z-10 max-w-2xl w-full bg-black/40 border border-primary/30 backdrop-blur-xl p-10 rounded-3xl shadow-xl"
      >
        <CheckCircle2 className="w-20 h-20 text-primary mx-auto mb-6 drop-shadow-[0_0_25px_rgba(0,255,255,0.8)]" />

        <h1
          className="text-center text-5xl font-bold mb-4"
          style={{
            background: "linear-gradient(90deg,#0ff,#8b5cff,#00eaff)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Level 1 Completed!
        </h1>

        <p className="text-center text-foreground/80 text-lg leading-relaxed mb-8">
          You successfully bypassed the JavaScript Guard.  
          <br />
          The system team is starting to panic. You're getting closer.
        </p>

        <div className="flex justify-center ">
          <Button
            size="lg"
            className="bg-primary px-8 py-6 rounded-xl text-white text-lg shadow-[0_0_20px_rgba(0,255,255,0.5)] hover:shadow-[0_0_35px_rgba(0,255,255,0.7)] transition-all group"
            onClick={() => router.push("/levels/2.1")}
          >
            <Sparkles className="w-5 h-5 mr-2 group-hover:rotate-90 transition-all" />
            Continue to Level 2
          </Button>
        </div>
      </motion.div>
    </section>
  );
}
