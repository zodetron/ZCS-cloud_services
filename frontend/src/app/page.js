"use client";

import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { Features } from "@/components/landing/features";
import { Pricing } from "@/components/landing/pricing";
import { DeveloperSection } from "@/components/landing/developer-section";
import { Footer } from "@/components/landing/footer";
import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import { ArrowRight, Database, Globe, Zap, Shield, Code2, BarChart3, Cloud, Server, Lock } from "lucide-react";
import Link from "next/link";

/* ── Marquee trust logos ─────────────────────────────────────── */
const trustLogos = [
  { icon: Database, label: "Supabase" },
  { icon: Cloud, label: "Vercel" },
  { icon: Server, label: "Railway" },
  { icon: Zap, label: "Netlify" },
  { icon: Code2, label: "GitHub" },
  { icon: Shield, label: "Stripe" },
  { icon: Globe, label: "Cloudflare" },
  { icon: BarChart3, label: "Datadog" },
  { icon: Lock, label: "Auth0" },
  { icon: Database, label: "PlanetScale" },
];

function TrustBar() {
  const doubled = [...trustLogos, ...trustLogos];
  return (
    <section className="py-16 bg-black border-y border-white/[0.05] overflow-hidden">
      <p className="text-center text-xs text-white/20 uppercase tracking-[0.2em] font-medium mb-8">
        Trusted by developers worldwide
      </p>
      <div className="relative">
        <div className="flex marquee-track gap-16 w-max">
          {doubled.map(({ icon: Icon, label }, i) => (
            <div key={i} className="flex items-center gap-2.5 text-white/20 hover:text-white/40 transition-colors shrink-0">
              <Icon className="w-5 h-5" />
              <span className="text-sm font-medium">{label}</span>
            </div>
          ))}
        </div>
        {/* Fade edges */}
        <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-black to-transparent pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-black to-transparent pointer-events-none" />
      </div>
    </section>
  );
}

/* ── Animated counter ────────────────────────────────────────── */
function Counter({ to, suffix = "" }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    const start = Date.now();
    const duration = 1800;
    const frame = () => {
      const progress = Math.min((Date.now() - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * to));
      if (progress < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }, [isInView, to]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

/* ── Stats section ───────────────────────────────────────────── */
const stats = [
  { label: "Objects stored", value: 10, suffix: "M+", fixed: null },
  { label: "API requests / day", value: 50, suffix: "M+", fixed: null },
  { label: "Uptime SLA", value: null, suffix: "", fixed: "99.99%" },
  { label: "Edge locations", value: 200, suffix: "+", fixed: null },
];

function StatsSection() {
  return (
    <section className="py-24 px-6 bg-black relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 80% 50% at 50% 50%, rgba(59,130,246,0.05) 0%, transparent 100%)" }} />
      <div className="max-w-5xl mx-auto relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-3 tracking-tight">
            Built for scale,<span className="text-gradient-hero"> proven in production</span>
          </h2>
          <p className="text-white/30 text-base">Numbers that speak for themselves.</p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 rounded-2xl overflow-hidden border border-white/[0.08]" style={{ background: "#0b0d18", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), 0 4px 32px rgba(0,0,0,0.5)" }}>
          {stats.map(({ label, value, suffix, fixed }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              className={`px-8 py-10 text-center ${i < 3 ? "border-r border-white/[0.06]" : ""} ${i >= 2 ? "border-t border-white/[0.06] md:border-t-0" : ""}`}
            >
              <div className="text-4xl md:text-5xl font-extrabold text-white mb-2 tracking-tight">
                {fixed ? fixed : <Counter to={value} suffix={suffix} />}
              </div>
              <p className="text-xs text-white/30 uppercase tracking-widest font-medium">{label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── CTA section ─────────────────────────────────────────────── */
function CTASection() {
  return (
    <section className="py-32 px-6 bg-black relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div
            className="animate-cta-pulse w-[700px] h-[400px] rounded-full"
            style={{ background: "radial-gradient(ellipse, rgba(59,130,246,0.12) 0%, rgba(139,92,246,0.06) 50%, transparent 80%)" }}
          />
        </div>
      </div>
      <div className="absolute inset-0 grid-pattern opacity-20 pointer-events-none" />

      <div className="max-w-4xl mx-auto text-center relative">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] text-xs text-white/40 font-medium mb-8 uppercase tracking-widest">
            Get started today
          </div>
          <h2 className="text-5xl md:text-7xl font-extrabold text-white tracking-tight leading-[0.95] mb-6">
            Ready to ship
            <br />
            <span className="text-gradient-hero">faster?</span>
          </h2>
          <p className="text-xl text-white/40 mb-10 max-w-xl mx-auto leading-relaxed">
            Join thousands of developers building on StorageCloud. Start free, scale to millions.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/auth/register"
              className="group flex items-center gap-2 px-8 py-4 rounded-full bg-white text-black font-semibold text-base hover:bg-white/90 transition-all duration-300 hover:scale-[1.04] hover:shadow-[0_0_40px_rgba(255,255,255,0.12)]"
            >
              Start for free — no credit card
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link
              href="/dashboard"
              className="group flex items-center gap-2 px-8 py-4 rounded-full border border-white/10 text-white/60 font-medium text-base hover:border-white/20 hover:text-white hover:bg-white/[0.04] transition-all duration-300"
            >
              View live demo
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ── Page ────────────────────────────────────────────────────── */
export default function Home() {
  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      <main>
        <Hero />
        <TrustBar />
        <Features />
        <StatsSection />
        <Pricing />
        <DeveloperSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
