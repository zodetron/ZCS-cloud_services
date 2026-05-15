"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function LoadingSpinner({ size = "default", className }) {
  const sizes = {
    sm: "w-4 h-4 border-2",
    default: "w-6 h-6 border-2",
    lg: "w-10 h-10 border-3",
    xl: "w-16 h-16 border-4",
  };

  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      className={cn(
        "rounded-full border-muted-foreground/20 border-t-blue-500",
        sizes[size],
        className
      )}
    />
  );
}

export function PageLoader() {
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-4"
      >
        <div className="relative w-16 h-16">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 rounded-full border-4 border-muted border-t-blue-500"
          />
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="absolute inset-2 rounded-full border-4 border-muted border-t-purple-500"
          />
        </div>
        <p className="text-sm text-muted-foreground animate-pulse">Loading...</p>
      </motion.div>
    </div>
  );
}

export function SkeletonCard({ className }) {
  return (
    <div className={cn("rounded-xl border border-border/50 p-6 space-y-4 animate-pulse", className)}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-muted" />
        <div className="space-y-2 flex-1">
          <div className="h-4 bg-muted rounded w-1/3" />
          <div className="h-3 bg-muted rounded w-1/2" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-muted rounded" />
        <div className="h-3 bg-muted rounded w-5/6" />
        <div className="h-3 bg-muted rounded w-4/6" />
      </div>
    </div>
  );
}
