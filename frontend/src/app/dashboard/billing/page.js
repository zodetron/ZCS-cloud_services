"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Receipt, Download, CreditCard, TrendingUp, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { BadgeStatus } from "@/components/ui/badge-status";
import { StatCard } from "@/components/ui/stat-card";
import { api } from "@/lib/api";

const GB = 1024 * 1024 * 1024;
function toGB(bytes) { return Number(bytes) / GB; }

function fmt(n) { return `$${Number(n).toFixed(2)}`; }

export default function BillingPage() {
  const [estimate, setEstimate] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [est, inv] = await Promise.all([
          api.get("/api/billing/estimate"),
          api.get("/api/billing/invoices"),
        ]);
        setEstimate(est);
        setInvoices(inv.invoices || []);
      } catch {
        // keep empty
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const storageGB = estimate ? toGB(estimate.usage?.storageBytes || 0) : 0;
  const downloadGB = estimate ? toGB(estimate.usage?.downloadBytes || 0) : 0;
  const requests = estimate?.usage?.requestCount || 0;
  const costs = estimate?.costs || {};
  const pricing = estimate?.pricing || {};
  const total = costs.total || 0;

  const breakdown = estimate ? [
    { label: `Storage (${storageGB.toFixed(2)} GB × $${pricing.storage_gb}/GB)`, cost: costs.storageCost || 0 },
    { label: `Download (${downloadGB.toFixed(2)} GB × $${pricing.download_gb}/GB)`, cost: costs.downloadCost || 0 },
    { label: `API Requests (${requests.toLocaleString()} × $${pricing.requests_per_1k}/1k)`, cost: costs.requestCost || 0 },
  ] : [];

  const ytd = invoices.reduce((s, inv) => s + Number(inv.amount || inv.total || 0), 0);
  const paidCount = invoices.filter((inv) => inv.status === "paid").length;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <PageHeader title="Billing" description="Usage-based billing, invoices, and cost breakdown." />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 rounded-xl border border-border/30 bg-card animate-pulse" />
          ))
        ) : (
          <>
            <StatCard title="Current Month Estimate" value={total} prefix="$" icon={CreditCard} color="blue" decimals={2} />
            <StatCard title="YTD Spend" value={ytd} prefix="$" icon={TrendingUp} color="purple" decimals={2} />
            <StatCard title="Invoices Paid" value={paidCount} icon={Receipt} color="emerald" />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current estimate */}
        <div className="rounded-xl border border-border/50 bg-card p-6">
          <h2 className="font-semibold text-foreground mb-1">
            {estimate?.period ? `${estimate.period} Estimate` : "Current Month Estimate"}
          </h2>
          <p className="text-sm text-muted-foreground mb-6">Accrued charges so far this month</p>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-10 bg-muted/20 rounded animate-pulse" />)}
            </div>
          ) : (
            <>
              <div className="space-y-3 mb-6">
                {breakdown.map(({ label, cost }) => (
                  <div key={label} className="flex items-center justify-between py-2 border-b border-border/20 last:border-0">
                    <span className="text-sm text-muted-foreground">{label}</span>
                    <span className="text-sm font-mono font-medium text-foreground">{fmt(cost)}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border/50">
                <span className="font-semibold text-foreground">Estimated total</span>
                <span className="text-2xl font-bold text-foreground">{fmt(total)}</span>
              </div>
            </>
          )}
        </div>

        {/* Invoice list */}
        <div className="rounded-xl border border-border/50 bg-card p-6">
          <h2 className="font-semibold text-foreground mb-6">Invoice History</h2>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-14 bg-muted/20 rounded-lg animate-pulse" />)}
            </div>
          ) : invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground/40 gap-2">
              <Receipt className="w-8 h-8" />
              <p className="text-sm">No invoices yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {invoices.map((inv, i) => (
                <motion.div
                  key={inv.id}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.07 }}
                  className="flex items-center justify-between p-3 rounded-lg border border-border/30 hover:bg-muted/20 transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-medium text-foreground">{inv.period || inv.id?.slice(0, 7)}</p>
                      <BadgeStatus status={inv.status} />
                    </div>
                    <p className="text-xs font-mono text-muted-foreground">{inv.id?.slice(0, 8)}…</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-medium text-foreground">{fmt(inv.amount || inv.total || 0)}</span>
                    <button className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
