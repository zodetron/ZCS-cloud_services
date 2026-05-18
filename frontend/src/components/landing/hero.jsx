"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { InfrastructureVisual } from "./infrastructure-visual";
import { useRef } from "react";

const stats = [
  { value: "99.99%", label: "Uptime SLA" },
  { value: "< 10ms", label: "P99 latency" },
  { value: "200+", label: "Edge PoPs" },
  { value: "10M+", label: "Objects served" },
];

const floatingDots = [
  { top: "20%", left: "8%", delay: 0, size: 4 },
  { top: "35%", left: "92%", delay: 1.5, size: 3 },
  { top: "60%", left: "5%", delay: 3, size: 5 },
  { top: "75%", left: "88%", delay: 0.8, size: 3 },
  { top: "15%", left: "75%", delay: 2.2, size: 4 },
  { top: "50%", left: "15%", delay: 4, size: 3 },
];

export function Hero() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  return (
    <section ref={ref} className="relative min-h-screen flex flex-col items-center justify-center pt-16 overflow-hidden bg-black">
      {/* Animated gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="orb-drift-1 absolute top-[15%] w-[900px] h-[700px] rounded-full"
          style={{ left: "calc(40% - 450px)", background: "radial-gradient(ellipse, rgba(59,130,246,0.13) 0%, transparent 65%)" }} />
        <div className="orb-drift-2 absolute top-[30%] left-[15%] w-[600px] h-[600px] rounded-full"
          style={{ background: "radial-gradient(ellipse, rgba(139,92,246,0.09) 0%, transparent 65%)" }} />
        <div className="orb-drift-3 absolute bottom-[20%] right-[10%] w-[500px] h-[500px] rounded-full"
          style={{ background: "radial-gradient(ellipse, rgba(16,185,129,0.07) 0%, transparent 65%)" }} />
        {/* Noise overlay */}
        <div className="absolute inset-0 opacity-[0.015]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }} />
      </div>

      {/* Grid */}
      <div className="absolute inset-0 grid-pattern opacity-30" />

      {/* Floating particles */}
      {floatingDots.map((dot, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-blue-400/30 pointer-events-none"
          style={{
            top: dot.top, left: dot.left,
            width: dot.size, height: dot.size,
            animation: `float-particle ${4 + dot.delay}s ease-in-out infinite ${dot.delay}s`,
          }}
        />
      ))}

      <motion.div style={{ y, opacity }} className="relative max-w-7xl mx-auto px-6 py-24 text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-blue-500/20 bg-blue-500/[0.07] mb-10"
        >
          <span className="animate-pulse-dot w-1.5 h-1.5 rounded-full bg-blue-400" />
          <span className="text-xs font-medium text-blue-300 tracking-wide">
            Global edge distribution — 200+ PoPs worldwide
          </span>
          <ArrowRight className="w-3 h-3 text-blue-400/70" />
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="text-[clamp(3rem,8vw,7rem)] font-extrabold tracking-tight text-white leading-[0.92] mb-6"
        >
          The storage layer
          <br />
          <span className="text-gradient-hero">your app deserves.</span>
        </motion.h1>

        {/* Subheading */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto mb-10 leading-relaxed font-normal"
        >
          Enterprise-grade multi-tenant object storage. S3-compatible, globally distributed,
          and engineered for the scale you're about to hit.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-wrap items-center justify-center gap-4 mb-16"
        >
          <Link
            href="/auth/register"
            className="group flex items-center gap-2 px-7 py-3.5 rounded-full bg-white text-black text-sm font-semibold hover:bg-white/90 transition-all duration-300 hover:scale-[1.04] hover:shadow-[0_0_30px_rgba(255,255,255,0.12)]"
          >
            Start for free
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <Link
            href="/auth/login"
            className="group flex items-center gap-2 px-7 py-3.5 rounded-full border border-white/10 text-white/60 text-sm font-medium hover:border-white/20 hover:text-white hover:bg-white/[0.04] transition-all duration-300"
          >
            View dashboard
            <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </Link>
        </motion.div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-wrap items-center justify-center gap-px mb-24"
        >
          {stats.map(({ value, label }, i) => (
            <div
              key={label}
              className={`flex flex-col items-center px-8 py-4 ${i < stats.length - 1 ? "border-r border-white/[0.06]" : ""}`}
            >
              <span className="text-2xl font-bold text-white tracking-tight">{value}</span>
              <span className="text-xs text-white/30 mt-0.5 font-medium uppercase tracking-wider">{label}</span>
            </div>
          ))}
        </motion.div>

        {/* Infrastructure visual */}
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1, delay: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="relative"
        >
          <InfrastructureVisual />
        </motion.div>
      </motion.div>
    </section>
  );
}
