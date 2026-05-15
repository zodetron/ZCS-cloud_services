"use client";

import { motion } from "framer-motion";
import { Database, Zap, Shield, Globe, Key, BarChart3, Clock, Code2, Layers, Lock, Activity, CreditCard } from "lucide-react";
import { staggerContainer, staggerItem, defaultTransition } from "@/lib/animations";

const features = [
  {
    icon: Database,
    title: "S3-Compatible API",
    description: "Drop-in replacement for AWS S3. Use any existing S3 SDK, CLI, or tool without code changes.",
    color: "blue",
  },
  {
    icon: Globe,
    title: "Global Edge Distribution",
    description: "200+ PoPs worldwide. Automatically route traffic to the nearest node for sub-10ms latency.",
    color: "purple",
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description: "Encryption at rest and in transit, RBAC, audit logs, presigned URLs, and SOC 2 compliance.",
    color: "emerald",
  },
  {
    icon: Key,
    title: "API Keys & Tokens",
    description: "Scoped API keys with fine-grained permissions. Rotate, revoke, and monitor usage in real-time.",
    color: "orange",
  },
  {
    icon: BarChart3,
    title: "Usage Analytics",
    description: "Real-time dashboards showing storage, bandwidth, requests, and cost breakdowns by bucket.",
    color: "blue",
  },
  {
    icon: CreditCard,
    title: "Usage-Based Billing",
    description: "Pay only for what you use. Transparent pricing with monthly invoices and budget alerts.",
    color: "purple",
  },
  {
    icon: Zap,
    title: "Presigned URLs",
    description: "Generate temporary signed URLs for direct browser uploads or secure downloads — no proxy needed.",
    color: "emerald",
  },
  {
    icon: Activity,
    title: "Rate Limiting",
    description: "Token bucket algorithm with Redis-backed enforcement. Per-tenant and per-key quotas.",
    color: "orange",
  },
  {
    icon: Layers,
    title: "Multi-Tenant Architecture",
    description: "Complete tenant isolation at every layer. Objects, buckets, and keys are strictly separated.",
    color: "blue",
  },
  {
    icon: Code2,
    title: "Developer-First SDK",
    description: "Official SDKs for Node.js, Python, Go, and more. OpenAPI spec, webhooks, and Terraform provider.",
    color: "purple",
  },
  {
    icon: Lock,
    title: "Bucket Policies",
    description: "Granular bucket-level policies with public/private access, CORS rules, and lifecycle hooks.",
    color: "emerald",
  },
  {
    icon: Clock,
    title: "Background Workers",
    description: "BullMQ-powered async workers for metering, billing aggregation, and cleanup jobs.",
    color: "orange",
  },
];

const colorMap = {
  blue: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20" },
  purple: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/20" },
  emerald: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20" },
  orange: { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/20" },
};

export function Features() {
  return (
    <section id="features" className="py-32 px-6 relative">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-20"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border/50 bg-muted/30 text-xs text-muted-foreground mb-4">
            Everything you need
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4 tracking-tight">
            Infrastructure-grade features
            <br />
            <span className="gradient-text">without the complexity</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            StorageCloud brings the best of AWS S3, Cloudflare R2, and enterprise storage into a single developer-first platform.
          </p>
        </motion.div>

        {/* Feature grid */}
        <motion.div
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((feature) => {
            const c = colorMap[feature.color];
            return (
              <motion.div
                key={feature.title}
                variants={staggerItem}
                transition={defaultTransition}
                className="group p-6 rounded-xl border border-border/50 bg-card hover:border-border transition-all duration-300 premium-card"
              >
                <div className={`inline-flex p-2.5 rounded-lg ${c.bg} border ${c.border} mb-4`}>
                  <feature.icon className={`w-5 h-5 ${c.text}`} />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
