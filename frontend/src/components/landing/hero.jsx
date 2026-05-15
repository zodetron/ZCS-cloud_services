"use client";

import { motion } from "framer-motion";
import { ArrowRight, Play, Zap, Shield, Globe, Database } from "lucide-react";
import { GradientButton } from "@/components/ui/gradient-button";
import { staggerContainer, staggerItem, defaultTransition } from "@/lib/animations";
import Link from "next/link";
import { InfrastructureVisual } from "./infrastructure-visual";

const badges = [
  { icon: Zap, label: "< 10ms latency" },
  { icon: Shield, label: "SOC 2 compliant" },
  { icon: Globe, label: "Global edge" },
  { icon: Database, label: "S3 compatible" },
];

export function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center pt-16 overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 grid-pattern" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-6 py-20 text-center">
        {/* Announcement badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 text-xs font-medium mb-8"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 pulse-glow" />
          Now with global edge distribution — 200+ PoPs
          <ArrowRight className="w-3 h-3" />
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight text-foreground mb-6 leading-[1.05]"
        >
          Object storage
          <br />
          <span className="gradient-text">built for builders</span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-12 leading-relaxed"
        >
          Enterprise-grade multi-tenant object storage. S3-compatible API, usage-based billing,
          <br className="hidden md:block" />
          global CDN, and developer-first tooling — all in one platform.
        </motion.p>

        {/* CTA buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="flex flex-wrap items-center justify-center gap-4 mb-16"
        >
          <GradientButton href="/auth/register" size="lg" variant="primary">
            Start for free <ArrowRight className="w-4 h-4" />
          </GradientButton>
          <GradientButton href="#demo" size="lg" variant="outline">
            <Play className="w-4 h-4" /> Watch demo
          </GradientButton>
        </motion.div>

        {/* Feature badges */}
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="flex flex-wrap items-center justify-center gap-3 mb-24"
        >
          {badges.map(({ icon: Icon, label }) => (
            <motion.div
              key={label}
              variants={staggerItem}
              transition={defaultTransition}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border/50 bg-background/50 backdrop-blur-sm text-sm text-muted-foreground"
            >
              <Icon className="w-3.5 h-3.5 text-blue-400" />
              {label}
            </motion.div>
          ))}
        </motion.div>

        {/* Infrastructure visual */}
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="relative"
        >
          <InfrastructureVisual />
        </motion.div>
      </div>
    </section>
  );
}
