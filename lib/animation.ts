// lib/animations.ts
import type { TargetAndTransition } from "framer-motion";

export const fadeIn = (d = 0.4): TargetAndTransition => ({ opacity: 1, transition: { duration: d } });
export const btnTap: TargetAndTransition = { scale: 0.96, transition: { duration: 0.12 } };
