"use client";

import { motion } from "framer-motion";
import { Check, ArrowRight, Zap, Building2, Sparkles } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const plans = [
  {
    name: "Starter",
    icon: Sparkles,
    price: 0,
    description: "For side projects and personal use",
    color: "white",
    features: [
      "5 GB storage included",
      "10,000 API requests / month",
      "1 GB egress bandwidth",
      "1 storage bucket",
      "Community support",
      "Basic usage analytics",
    ],
    cta: "Get started free",
    href: "/auth/register",
    highlighted: false,
  },
  {
    name: "Pro",
    icon: Zap,
    price: 29,
    description: "For production apps and growing teams",
    color: "blue",
    features: [
      "100 GB storage included",
      "1M API requests / month",
      "50 GB egress bandwidth",
      "Unlimited buckets",
      "Priority support",
      "Advanced analytics",
      "Custom API keys & scopes",
      "Presigned URLs",
      "Webhook events",
    ],
    cta: "Start Pro trial",
    href: "/auth/register?plan=pro",
    highlighted: true,
    badge: "Most popular",
  },
  {
    name: "Enterprise",
    icon: Building2,
    price: null,
    description: "For large teams with custom requirements",
    color: "violet",
    features: [
      "Unlimited storage",
      "Unlimited API requests",
      "Custom egress pricing",
      "Multi-region replication",
      "99.99% SLA guarantee",
      "Dedicated account manager",
      "SSO & SAML 2.0",
      "Custom contracts",
      "Full audit logs",
    ],
    cta: "Contact sales",
    href: "/contact",
    highlighted: false,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="py-32 px-6 bg-black relative overflow-hidden">
      <div className="absolute inset-0 grid-pattern opacity-20 pointer-events-none" />

      {/* Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(ellipse, rgba(59,130,246,0.06) 0%, transparent 70%)" }} />

      <div className="max-w-7xl mx-auto relative">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] text-xs text-white/55 font-medium mb-5 uppercase tracking-widest">
            Simple pricing
          </div>
          <h2 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight leading-[1.05] mb-5">
            Pay for what you use,
            <br />
            <span className="text-gradient-hero">nothing more.</span>
          </h2>
          <p className="text-lg text-white/55 max-w-xl mx-auto">
            Start for free. Scale without surprises. No hidden fees.
          </p>
        </motion.div>

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              className={cn(
                "relative rounded-2xl border p-8 transition-all duration-300",
                plan.highlighted
                  ? "border-blue-500/25 shadow-[inset_0_1px_0_rgba(96,165,250,0.15),0_4px_32px_rgba(0,0,0,0.5),0_0_60px_rgba(59,130,246,0.1)]"
                  : "border-white/[0.08] hover:border-white/[0.14] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_4px_24px_rgba(0,0,0,0.5)]"
              )}
              style={{ background: plan.highlighted ? "linear-gradient(160deg, #0d1628 0%, #0b0d18 60%)" : "#0b0d18" }}
            >
              {plan.badge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-500/30">
                    <Zap className="w-3 h-3" />
                    {plan.badge}
                  </div>
                </div>
              )}

              {/* Plan header */}
              <div className="mb-8">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center",
                    plan.highlighted ? "bg-blue-500/15 ring-1 ring-blue-500/30" : "bg-white/[0.05] ring-1 ring-white/[0.08]"
                  )}>
                    <plan.icon className={cn("w-4.5 h-4.5", plan.highlighted ? "text-blue-400" : "text-white/50")} style={{ width: 18, height: 18 }} />
                  </div>
                  <span className="font-semibold text-white text-base">{plan.name}</span>
                </div>
                <p className="text-sm text-white/55 mb-5">{plan.description}</p>
                <div className="flex items-baseline gap-1">
                  {plan.price !== null ? (
                    <>
                      <span className="text-5xl font-extrabold text-white tracking-tight">${plan.price}</span>
                      <span className="text-white/30 text-sm ml-1">/month</span>
                    </>
                  ) : (
                    <span className="text-5xl font-extrabold text-white tracking-tight">Custom</span>
                  )}
                </div>
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-sm">
                    <div className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center shrink-0",
                      plan.highlighted ? "bg-blue-500/20 ring-1 ring-blue-500/30" : "bg-white/[0.05] ring-1 ring-white/[0.08]"
                    )}>
                      <Check className={cn("w-2.5 h-2.5", plan.highlighted ? "text-blue-400" : "text-white/55")} />
                    </div>
                    <span className="text-white/50">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Link
                href={plan.href}
                className={cn(
                  "flex items-center justify-center gap-2 w-full py-3 rounded-full text-sm font-semibold transition-all duration-200 hover:scale-[1.02]",
                  plan.highlighted
                    ? "bg-blue-500 text-white hover:bg-blue-400 shadow-lg shadow-blue-500/25"
                    : "border border-white/10 text-white/60 hover:border-white/20 hover:text-white hover:bg-white/[0.04]"
                )}
              >
                {plan.cta}
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Usage overages */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="mt-12 flex items-center justify-center"
        >
          <div className="flex items-center divide-x divide-white/[0.06] rounded-2xl border border-white/[0.08] overflow-hidden" style={{ background: "#0b0d18", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), 0 4px 24px rgba(0,0,0,0.4)" }}>
            <div className="px-8 py-5 text-center">
              <p className="text-xs text-white/30 mb-1 uppercase tracking-widest">Storage overage</p>
              <p className="font-mono font-semibold text-blue-400 text-sm">$0.023 / GB</p>
            </div>
            <div className="px-8 py-5 text-center">
              <p className="text-xs text-white/30 mb-1 uppercase tracking-widest">Egress overage</p>
              <p className="font-mono font-semibold text-violet-400 text-sm">$0.09 / GB</p>
            </div>
            <div className="px-8 py-5 text-center">
              <p className="text-xs text-white/30 mb-1 uppercase tracking-widest">Request overage</p>
              <p className="font-mono font-semibold text-emerald-400 text-sm">$0.0004 / 1k</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
