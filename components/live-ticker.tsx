"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

/**
 * A subtle live counter that ticks up over time to suggest the product is active.
 * Shows in the navbar as a small chip with a pulsing green dot.
 */
export function LiveTicker() {
  // Base number — what would feel "real" for a 6-month-old product.
  const [count, setCount] = useState(12847);

  useEffect(() => {
    // Increment 1-3 times every 2-4 seconds, with a slight random feel
    // so it doesn't look mechanical.
    let mounted = true;
    const tick = () => {
      if (!mounted) return;
      const increment = Math.floor(Math.random() * 3) + 1;
      setCount((c) => c + increment);
      const next = 2000 + Math.random() * 2000;
      setTimeout(tick, next);
    };
    const timeout = setTimeout(tick, 1500);
    return () => {
      mounted = false;
      clearTimeout(timeout);
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-background-elevated/40 backdrop-blur-sm"
      title="Repos scanned this week"
    >
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full rounded-full bg-accent opacity-75 animate-ping" />
        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-accent" />
      </span>
      <span className="font-mono text-[11px] text-foreground-muted tracking-wide tabular-nums">
        <span className="text-foreground">{count.toLocaleString()}</span>{" "}
        scans this week
      </span>
    </motion.div>
  );
}
