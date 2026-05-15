"use client";

import { motion, useMotionValue, useSpring, useTransform, animate } from "framer-motion";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

function AnimatedNumber({ value, decimals = 0, prefix = "", suffix = "" }) {
  const ref = useRef(null);
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, { duration: 1200, bounce: 0.1 });

  useEffect(() => {
    motionValue.set(value);
  }, [value, motionValue]);

  useEffect(() => {
    return springValue.on("change", (latest) => {
      if (ref.current) {
        ref.current.textContent = prefix + latest.toFixed(decimals) + suffix;
      }
    });
  }, [springValue, decimals, prefix, suffix]);

  return <span ref={ref}>{prefix}{(0).toFixed(decimals)}{suffix}</span>;
}

export function StatCard({ title, value, change, changeLabel, icon: Icon, color = "blue", prefix = "", suffix = "", decimals = 0, className }) {
  const colors = {
    blue: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20" },
    purple: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/20" },
    green: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20" },
    orange: { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/20" },
    red: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/20" },
  };

  const c = colors[color] || colors.blue;
  const isPositive = change > 0;
  const isNeutral = change === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn(
        "relative p-6 rounded-xl border bg-card overflow-hidden premium-card",
        className
      )}
    >
      {/* Background gradient */}
      <div className={cn("absolute inset-0 opacity-30", c.bg)} />

      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div className={cn("p-2 rounded-lg", c.bg, "border", c.border)}>
            {Icon && <Icon className={cn("w-4 h-4", c.text)} />}
          </div>
          {change !== undefined && (
            <div className={cn(
              "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
              isPositive ? "text-emerald-400 bg-emerald-500/10" :
              isNeutral ? "text-muted-foreground bg-muted/50" :
              "text-red-400 bg-red-500/10"
            )}>
              {isPositive ? <TrendingUp className="w-3 h-3" /> :
               isNeutral ? <Minus className="w-3 h-3" /> :
               <TrendingDown className="w-3 h-3" />}
              {Math.abs(change)}%
            </div>
          )}
        </div>

        <div className="space-y-1">
          <p className="text-2xl font-bold text-foreground tracking-tight">
            <AnimatedNumber value={typeof value === 'number' ? value : 0} decimals={decimals} prefix={prefix} suffix={suffix} />
          </p>
          <p className="text-sm text-muted-foreground">{title}</p>
          {changeLabel && (
            <p className="text-xs text-muted-foreground/70">{changeLabel}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
