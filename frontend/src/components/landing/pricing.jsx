"use client";

import { motion } from "framer-motion";
import { Check, Zap, ArrowRight } from "lucide-react";
import { GradientButton } from "@/components/ui/gradient-button";
import { staggerContainer, staggerItem, defaultTransition } from "@/lib/animations";
import { cn } from "@/lib/utils";

const plans = [
  {
    name: "Free",
    price: 0,
    description: "For individuals and side projects",
    features: [
      "5 GB storage",
      "10,000 API requests/month",
      "1 GB egress bandwidth",
      "1 bucket",
      "Community support",
      "Basic analytics",
    ],
    cta: "Get started",
    href: "/auth/register",
    highlighted: false,
  },
  {
    name: "Pro",
    price: 29,
    description: "For growing teams and production apps",
    features: [
      "100 GB storage included",
      "1M API requests/month",
      "50 GB egress bandwidth",
      "Unlimited buckets",
      "Priority support",
      "Advanced analytics",
      "Custom API keys",
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
    price: null,
    description: "For large teams with custom requirements",
    features: [
      "Unlimited storage",
      "Unlimited API requests",
      "Custom egress pricing",
      "Multi-region replication",
      "SLA guarantees",
      "Dedicated support",
      "SSO & SAML",
      "Custom contracts",
      "Audit logs",
    ],
    cta: "Contact sales",
    href: "/contact",
    highlighted: false,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="py-32 px-6 relative">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/2 to-transparent pointer-events-none" />

      <div className="max-w-7xl mx-auto relative">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border/50 bg-muted/30 text-xs text-muted-foreground mb-4">
            Simple pricing
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4 tracking-tight">
            Pay for what you use,
            <br />
            <span className="gradient-text">nothing more</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-xl mx-auto">
            Start for free. Scale as you grow. No hidden fees, no surprises.
          </p>
        </motion.div>

        {/* Plans */}
        <motion.div
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          {plans.map((plan) => (
            <motion.div
              key={plan.name}
              variants={staggerItem}
              transition={defaultTransition}
              className={cn(
                "relative rounded-2xl p-8 border transition-all duration-300",
                plan.highlighted
                  ? "border-blue-500/50 bg-blue-500/5 glow-blue"
                  : "border-border/50 bg-card"
              )}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-blue-500 text-white text-xs font-medium">
                    <Zap className="w-3 h-3" />
                    {plan.badge}
                  </div>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-foreground mb-1">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>
                <div className="flex items-baseline gap-1">
                  {plan.price !== null ? (
                    <>
                      <span className="text-4xl font-bold text-foreground">${plan.price}</span>
                      <span className="text-muted-foreground">/month</span>
                    </>
                  ) : (
                    <span className="text-4xl font-bold text-foreground">Custom</span>
                  )}
                </div>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-sm">
                    <div className={cn(
                      "w-4 h-4 rounded-full flex items-center justify-center shrink-0",
                      plan.highlighted ? "bg-blue-500" : "bg-emerald-500"
                    )}>
                      <Check className="w-2.5 h-2.5 text-white" />
                    </div>
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <GradientButton
                href={plan.href}
                variant={plan.highlighted ? "primary" : "outline"}
                className="w-full justify-center"
              >
                {plan.cta} <ArrowRight className="w-3.5 h-3.5" />
              </GradientButton>
            </motion.div>
          ))}
        </motion.div>

        {/* Usage-based pricing note */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-16 text-center"
        >
          <div className="inline-flex flex-col items-center gap-4 p-6 rounded-2xl border border-border/50 bg-card">
            <p className="text-sm font-medium text-foreground">Usage-based overages</p>
            <div className="grid grid-cols-3 gap-8 text-sm">
              <div>
                <p className="text-muted-foreground mb-1">Storage</p>
                <p className="font-mono font-medium text-blue-400">$0.023/GB</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Egress</p>
                <p className="font-mono font-medium text-purple-400">$0.09/GB</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Requests</p>
                <p className="font-mono font-medium text-emerald-400">$0.0004/1k</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
