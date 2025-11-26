"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion, type Transition } from "framer-motion";

interface Props {
  colors?: string[];
  intensity?: "low" | "medium" | "high";
  speed?: number;
  showParticles?: boolean;
}

type Particle = { left: string; top: string; size: number; duration: number; delay: number };

export default function AuroraBackground({
  colors = ["#00fff5", "#8a5cff", "#00eaff", "#ff006e"],
  intensity = "medium",
  speed = 1,
  showParticles = false,
}: Props) {
  // particles generated only on client to avoid SSR mismatch
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (!showParticles) return;
    const arr: Particle[] = Array.from({ length: 14 }).map(() => ({
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      size: 2 + Math.random() * 4,
      duration: 18 + Math.random() * 12,
      delay: Math.random() * 6,
    }));
    setParticles(arr);
  }, [showParticles]);

  const beams = useMemo(
    () => [
      { x: "6%", delay: 0, colorIndex: 0, height: "140%" },
      { x: "26%", delay: 0.8, colorIndex: 1, height: "160%" },
      { x: "48%", delay: 0.3, colorIndex: 2, height: "150%" },
      { x: "72%", delay: 1.2, colorIndex: 3, height: "170%" },
    ],
    []
  );

  const intensityMap = { low: 0.14, medium: 0.26, high: 0.44 };
  const opacity = intensityMap[intensity] ?? 0.26;

  const transition: Transition = { duration: 12 / speed, repeat: Infinity, ease: "easeInOut" };

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0">
      <div className="absolute inset-0 bg-gradient-to-b from-[#020617] via-[#030712] to-black" />

      {/* vertical beams */}
      {beams.map((b, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity, x: ["-3%", "3%", "0%"] }}
          transition={{ ...transition, delay: b.delay }}
          className="absolute top-0 w-[18%]"
          style={{
            left: b.x,
            height: b.height,
            background: `linear-gradient(180deg, ${colors[b.colorIndex]}55, ${colors[b.colorIndex]}22, transparent)`,
            filter: "blur(36px)",
          }}
        />
      ))}

      {/* gentle ambient glow */}
      <motion.div
        initial={{ opacity: 0.06 }}
        animate={{ opacity: [0.06, 0.18, 0.06] }}
        transition={{ duration: 10, repeat: Infinity }}
        className="absolute inset-0"
        style={{ background: `radial-gradient(ellipse at 50% 100%, ${colors[0]}33, transparent 70%)`, filter: "blur(160px)" }}
      />

      {/* particles (client-only) */}
      {particles.map((p, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full blur-sm"
          style={{
            width: p.size,
            height: p.size,
            background: colors[i % colors.length],
            left: p.left,
            top: p.top,
            opacity: 0.85,
          }}
          animate={{ y: [0, -60, 0], opacity: [0, 0.6, 0] }}
          transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: "easeInOut" }}
        />
      ))}

      {/* subtle star/noise overlay */}
      <div
        className="absolute inset-0 opacity-20 mix-blend-screen"
        style={{
          backgroundImage:
            "url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 200 200%22%3E%3Ccircle cx=%2210%22 cy=%2210%22 r=%221%22 fill=%22white%22/%3E%3Ccircle cx=%2290%22 cy=%2230%22 r=%221%22 fill=%22white%22/%3E%3Ccircle cx=%2250%22 cy=%22150%22 r=%222%22 fill=%22white%22/%3E%3Ccircle cx=%22130%22 cy=%22180%22 r=%221%22 fill=%22white%22/%3E%3Ccircle cx=%22170%22 cy=%2250%22 r=%222%22 fill=%22white%22/%3E%3C/svg%3E')",
        }}
      />
    </div>
  );
}
