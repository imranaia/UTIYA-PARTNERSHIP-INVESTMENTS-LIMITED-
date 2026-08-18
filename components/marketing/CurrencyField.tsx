"use client";

import { useEffect } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { cn } from "@/lib/utils";

type Glyph = {
  left: string;
  top: string;
  size: number;
  depth: number;
  duration: number;
  delay: number;
  tone: "green" | "gold";
};

// Positions cluster toward the edges so the hero copy on the left stays clear.
const GLYPHS: Glyph[] = [
  { left: "78%", top: "8%", size: 46, depth: 22, duration: 7, delay: 0, tone: "green" },
  { left: "92%", top: "28%", size: 30, depth: 34, duration: 8.5, delay: 0.5, tone: "gold" },
  { left: "70%", top: "52%", size: 26, depth: 30, duration: 6.5, delay: 1.1, tone: "gold" },
  { left: "88%", top: "70%", size: 40, depth: 18, duration: 9, delay: 0.2, tone: "green" },
  { left: "58%", top: "86%", size: 22, depth: 36, duration: 7.6, delay: 1.6, tone: "green" },
  { left: "6%", top: "80%", size: 24, depth: 28, duration: 8.2, delay: 0.8, tone: "gold" },
];

// Honest CSS depth, not a WebGL scene: glossy radial highlight + a dark inner
// rim on each badge fakes a 3D coin, and pointer-driven parallax sells the
// depth without the bundle-size/perf cost of Three.js on a mobile-first,
// low-bandwidth audience.
export function CurrencyField() {
  const reduce = useReducedMotion();
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 40, damping: 20, mass: 0.6 });
  const sy = useSpring(py, { stiffness: 40, damping: 20, mass: 0.6 });

  useEffect(() => {
    if (reduce) return;
    function onMove(e: PointerEvent) {
      px.set(e.clientX / window.innerWidth - 0.5);
      py.set(e.clientY / window.innerHeight - 0.5);
    }
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [reduce, px, py]);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {GLYPHS.map((glyph, i) => (
        <CoinBadge key={i} glyph={glyph} sx={sx} sy={sy} reduce={!!reduce} />
      ))}
    </div>
  );
}

function CoinBadge({
  glyph,
  sx,
  sy,
  reduce,
}: {
  glyph: Glyph;
  sx: ReturnType<typeof useSpring>;
  sy: ReturnType<typeof useSpring>;
  reduce: boolean;
}) {
  const x = useTransform(sx, (v) => v * glyph.depth);
  const y = useTransform(sy, (v) => v * glyph.depth);

  return (
    <motion.div
      className="absolute"
      style={{
        left: glyph.left,
        top: glyph.top,
        width: glyph.size,
        height: glyph.size,
        x: reduce ? 0 : x,
        y: reduce ? 0 : y,
      }}
      animate={reduce ? undefined : { y: [0, -14, 0] }}
      transition={
        reduce ? undefined : { duration: glyph.duration, delay: glyph.delay, repeat: Infinity, ease: "easeInOut" }
      }
    >
      <div
        className={cn(
          "flex h-full w-full items-center justify-center rounded-full font-semibold",
          glyph.tone === "green" ? "text-[oklch(0.2_0_0)]" : "text-[oklch(0.28_0.04_75)]",
        )}
        style={{
          fontSize: glyph.size * 0.42,
          background:
            glyph.tone === "green"
              ? "radial-gradient(circle at 32% 28%, oklch(0.9 0.14 125), var(--brand) 55%, oklch(0.5 0.13 140) 100%)"
              : "radial-gradient(circle at 32% 28%, oklch(0.95 0.06 90), var(--gold) 55%, oklch(0.58 0.1 75) 100%)",
          boxShadow:
            "inset 0 2px 2px rgba(255,255,255,0.65), inset 0 -4px 8px rgba(0,0,0,0.2), 0 12px 24px -10px rgba(0,0,0,0.35)",
        }}
      >
        &#8358;
      </div>
    </motion.div>
  );
}
