"use client";

import { motion } from "framer-motion";
import { Database, Zap, Shield, Globe, Key, BarChart3, Activity, Code2, Layers, Lock, CreditCard, Clock } from "lucide-react";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
};

function BentoCard({ children, className = "", delay = 0 }) {
  return (
    <motion.div
      {...fadeUp}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={`bento-card rounded-2xl border border-white/[0.08] overflow-hidden relative group ${className}`}
      style={{ background: "#0b0d18", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), 0 4px 24px rgba(0,0,0,0.5)" }}
    >
      {children}
    </motion.div>
  );
}

function MiniCodeBlock() {
  const lines = [
    { indent: 0, tokens: [{ t: "import", c: "#7c83f5" }, { t: " { StorageCloud } ", c: "#e2e8f0" }, { t: "from", c: "#7c83f5" }, { t: " '@storagecloud/sdk'", c: "#86efac" }] },
    { indent: 0, tokens: [] },
    { indent: 0, tokens: [{ t: "const", c: "#7c83f5" }, { t: " client ", c: "#e2e8f0" }, { t: "=", c: "#94a3b8" }, { t: " new StorageCloud({", c: "#e2e8f0" }] },
    { indent: 1, tokens: [{ t: "apiKey", c: "#f8fafc" }, { t: ": process.env.", c: "#94a3b8" }, { t: "API_KEY", c: "#86efac" }] },
    { indent: 0, tokens: [{ t: "});", c: "#e2e8f0" }] },
    { indent: 0, tokens: [] },
    { indent: 0, tokens: [{ t: "const", c: "#7c83f5" }, { t: " { url } ", c: "#e2e8f0" }, { t: "= await", c: "#7c83f5" }, { t: " client.", c: "#94a3b8" }, { t: "upload", c: "#60a5fa" }, { t: "({", c: "#e2e8f0" }] },
    { indent: 1, tokens: [{ t: "bucket", c: "#f8fafc" }, { t: ": ", c: "#94a3b8" }, { t: "'my-assets'", c: "#86efac" }] },
    { indent: 1, tokens: [{ t: "key", c: "#f8fafc" }, { t: ": ", c: "#94a3b8" }, { t: "'videos/hero.mp4'", c: "#86efac" }] },
    { indent: 0, tokens: [{ t: "});", c: "#e2e8f0" }] },
  ];

  return (
    <div className="code-terminal rounded-xl p-4 font-mono text-xs leading-6 overflow-hidden">
      {lines.map((line, i) => (
        <div key={i} className="flex">
          <span className="text-white/20 select-none mr-4 w-4 text-right shrink-0">{i + 1}</span>
          <span style={{ paddingLeft: `${line.indent * 16}px` }}>
            {line.tokens.map((tok, j) => (
              <span key={j} style={{ color: tok.c }}>{tok.t}</span>
            ))}
          </span>
        </div>
      ))}
    </div>
  );
}

function MiniMetricsVisual() {
  const bars = [65, 82, 48, 91, 73, 88, 60, 95, 71, 84, 56, 79];
  return (
    <div className="flex items-end gap-1.5 h-20 px-1">
      {bars.map((h, i) => (
        <motion.div
          key={i}
          initial={{ scaleY: 0 }}
          whileInView={{ scaleY: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
          style={{ height: `${h}%`, originY: 1 }}
          className="flex-1 rounded-sm bg-gradient-to-t from-blue-500 to-violet-500 opacity-70"
        />
      ))}
    </div>
  );
}

function MiniGlobeVisual() {
  const nodes = [
    { x: 20, y: 30 }, { x: 50, y: 15 }, { x: 78, y: 25 },
    { x: 85, y: 60 }, { x: 60, y: 75 }, { x: 25, y: 70 },
    { x: 42, y: 48 },
  ];
  return (
    <svg viewBox="0 0 120 90" className="w-full h-20 opacity-80">
      {nodes.map((n, i) =>
        nodes.slice(i + 1).map((m, j) => {
          const dist = Math.hypot(n.x - m.x, n.y - m.y);
          if (dist > 45) return null;
          return (
            <line key={`${i}-${j}`} x1={n.x} y1={n.y} x2={m.x} y2={m.y}
              stroke="rgba(96,165,250,0.15)" strokeWidth="0.5" />
          );
        })
      )}
      {nodes.map((n, i) => (
        <circle
          key={i} cx={n.x} cy={n.y} r="3" fill="#3b82f6"
          className="animate-node-pulse"
          style={{ animationDelay: `${i * 0.4}s` }}
        />
      ))}
    </svg>
  );
}

const smallFeatures = [
  { icon: Shield, color: "violet", title: "Enterprise Security", desc: "Encryption at rest and in transit, RBAC, audit logs, SOC 2." },
  { icon: Key, color: "orange", title: "API Key Management", desc: "Scoped keys with fine-grained permissions. Rotate and revoke anytime." },
  { icon: Layers, color: "blue", title: "Multi-Tenant", desc: "Complete tenant isolation at every layer — objects, buckets, and keys." },
  { icon: Lock, color: "emerald", title: "Bucket Policies", desc: "Granular bucket-level access control with CORS and lifecycle rules." },
  { icon: Zap, color: "yellow", title: "Presigned URLs", desc: "Temporary signed URLs for direct browser uploads — no proxy needed." },
  { icon: Clock, color: "pink", title: "Background Workers", desc: "BullMQ-powered async processing for metering and billing aggregation." },
];

const colorMap = {
  blue:    { bg: "bg-blue-500/10", text: "text-blue-400", ring: "ring-blue-500/20" },
  violet:  { bg: "bg-violet-500/10", text: "text-violet-400", ring: "ring-violet-500/20" },
  orange:  { bg: "bg-orange-500/10", text: "text-orange-400", ring: "ring-orange-500/20" },
  emerald: { bg: "bg-emerald-500/10", text: "text-emerald-400", ring: "ring-emerald-500/20" },
  yellow:  { bg: "bg-yellow-500/10", text: "text-yellow-400", ring: "ring-yellow-500/20" },
  pink:    { bg: "bg-pink-500/10", text: "text-pink-400", ring: "ring-pink-500/20" },
};

export function Features() {
  return (
    <section id="features" className="py-32 px-6 bg-black relative overflow-hidden">
      <div className="absolute inset-0 grid-pattern opacity-20 pointer-events-none" />

      <div className="max-w-7xl mx-auto relative">
        {/* Header */}
        <motion.div
          {...fadeUp}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] text-xs text-white/55 font-medium mb-5 uppercase tracking-widest">
            Everything you need
          </div>
          <h2 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight leading-[1.05] mb-5">
            Infrastructure-grade features
            <br />
            <span className="text-gradient-hero">without the complexity</span>
          </h2>
          <p className="text-lg text-white/55 max-w-xl mx-auto leading-relaxed">
            The best of AWS S3, Cloudflare R2, and enterprise storage — in a single developer-first platform.
          </p>
        </motion.div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Row 1: S3 Compatible (large) + Global Edge */}
          <BentoCard className="md:col-span-2 p-7" delay={0.05}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 ring-1 ring-blue-500/20 flex items-center justify-center">
                <Database className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-base">S3-Compatible API</h3>
                <p className="text-xs text-white/30 mt-0.5">Drop-in replacement for AWS S3</p>
              </div>
            </div>
            <p className="text-sm text-white/65 leading-relaxed mb-6">
              Use any existing S3 SDK, CLI, or tool without code changes. boto3, AWS SDK, rclone — all work out of the box.
            </p>
            <MiniCodeBlock />
          </BentoCard>

          <BentoCard className="p-7" delay={0.1}>
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 ring-1 ring-violet-500/20 flex items-center justify-center mb-5">
              <Globe className="w-5 h-5 text-violet-400" />
            </div>
            <h3 className="font-semibold text-white text-base mb-2">Global Edge Distribution</h3>
            <p className="text-sm text-white/65 leading-relaxed mb-5">
              200+ PoPs worldwide. Sub-10ms latency anywhere on Earth.
            </p>
            <MiniGlobeVisual />
          </BentoCard>

          {/* Row 2: Analytics (large) + Rate Limiting */}
          <BentoCard className="p-7" delay={0.15}>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/20 flex items-center justify-center mb-5">
              <Activity className="w-5 h-5 text-emerald-400" />
            </div>
            <h3 className="font-semibold text-white text-base mb-2">Rate Limiting</h3>
            <p className="text-sm text-white/65 leading-relaxed">
              Token bucket algorithm with Redis-backed enforcement. Per-tenant and per-key quotas.
            </p>
          </BentoCard>

          <BentoCard className="md:col-span-2 p-7" delay={0.2}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 ring-1 ring-blue-500/20 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-base">Usage Analytics</h3>
                <p className="text-xs text-white/30 mt-0.5">Real-time dashboards, live metrics</p>
              </div>
            </div>
            <p className="text-sm text-white/65 leading-relaxed mb-5">
              Storage, bandwidth, requests, and cost breakdowns per bucket — updated in real-time.
            </p>
            <MiniMetricsVisual />
          </BentoCard>

          {/* Row 3: Developer SDK (large) + Billing */}
          <BentoCard className="md:col-span-2 p-7" delay={0.25}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 ring-1 ring-violet-500/20 flex items-center justify-center">
                <Code2 className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-base">Developer-First SDK</h3>
                <p className="text-xs text-white/30 mt-0.5">Node.js · Python · Go · REST</p>
              </div>
            </div>
            <p className="text-sm text-white/65 leading-relaxed mb-6">
              Official SDKs for Node.js, Python, Go, and more. OpenAPI spec, webhooks, and Terraform provider included.
            </p>
            <div className="flex flex-wrap gap-2">
              {["Node.js", "Python", "Go", "REST API", "OpenAPI", "Terraform"].map((tag) => (
                <span key={tag} className="px-3 py-1 rounded-full text-xs border border-white/[0.08] text-white/55 bg-white/[0.02]">{tag}</span>
              ))}
            </div>
          </BentoCard>

          <BentoCard className="p-7" delay={0.3}>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/20 flex items-center justify-center mb-5">
              <CreditCard className="w-5 h-5 text-emerald-400" />
            </div>
            <h3 className="font-semibold text-white text-base mb-2">Usage-Based Billing</h3>
            <p className="text-sm text-white/65 leading-relaxed">
              Pay only for what you use. Monthly invoices with transparent breakdowns.
            </p>
            <div className="mt-5 space-y-2">
              {[["Storage", "$0.023/GB"], ["Egress", "$0.09/GB"], ["Requests", "$0.0004/1k"]].map(([k, v]) => (
                <div key={k} className="flex justify-between text-xs">
                  <span className="text-white/30">{k}</span>
                  <span className="font-mono text-white/60">{v}</span>
                </div>
              ))}
            </div>
          </BentoCard>

          {/* Row 4: Small feature cards */}
          {smallFeatures.map((f, i) => {
            const c = colorMap[f.color];
            return (
              <BentoCard key={f.title} className="p-6" delay={0.35 + i * 0.05}>
                <div className={`inline-flex w-9 h-9 rounded-xl ${c.bg} ring-1 ${c.ring} items-center justify-center mb-4`}>
                  <f.icon className={`w-4 h-4 ${c.text}`} />
                </div>
                <h3 className="font-semibold text-white text-sm mb-1.5">{f.title}</h3>
                <p className="text-xs text-white/55 leading-relaxed">{f.desc}</p>
              </BentoCard>
            );
          })}
        </div>
      </div>
    </section>
  );
}
