"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function GlassCard({ children, className, hover = true, glow = false, animate = false, ...props }) {
  const base = cn(
    "relative rounded-xl border border-white/8 bg-white/5 backdrop-blur-md",
    "dark:border-white/6 dark:bg-black/30",
    glow && "glow-blue",
    hover && "premium-card cursor-default",
    className
  );

  if (animate) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
        className={base}
        {...props}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div className={base} {...props}>
      {children}
    </div>
  );
}

export function GlassCardHeader({ children, className }) {
  return (
    <div className={cn("p-6 pb-0", className)}>
      {children}
    </div>
  );
}

export function GlassCardContent({ children, className }) {
  return (
    <div className={cn("p-6", className)}>
      {children}
    </div>
  );
}

export function GlassCardFooter({ children, className }) {
  return (
    <div className={cn("p-6 pt-0 flex items-center", className)}>
      {children}
    </div>
  );
}
