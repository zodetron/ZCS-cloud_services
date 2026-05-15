"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, Database, Server, Activity, AlertTriangle, HardDrive } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { PageHeader } from "@/components/ui/page-header";
import { BadgeStatus } from "@/components/ui/badge-status";
import { staggerContainer, staggerItem, defaultTransition } from "@/lib/animations";
import { api } from "@/lib/api";

const GB = 1024 * 1024 * 1024;
const TB = GB * 1024;

function formatStorage(bytes) {
  const n = Number(bytes);
  if (n >= TB) return { value: +(n / TB).toFixed(2), suffix: " TB" };
  if (n >= GB) return { value: +(n / GB).toFixed(2), suffix: " GB" };
  return { value: +(n / (1024 * 1024)).toFixed(1), suffix: " MB" };
}

function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(date).toLocaleDateString();
}

export default function AdminPage() {
  const [stats, setStats] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [s, t] = await Promise.all([
          api.get("/api/admin/stats"),
          api.get("/api/admin/tenants?limit=5"),
        ]);
        setStats(s);
        setTenants(t.tenants || []);
      } catch {
        // keep empty
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const storage = stats ? formatStorage(stats.totalStorageBytes) : { value: 0, suffix: " GB" };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <PageHeader title="Platform Overview" description="Global platform health and key metrics." badge="Admin" />

      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-xl border border-border/30 bg-card animate-pulse" />
          ))
        ) : (
          <>
            <motion.div variants={staggerItem} transition={defaultTransition}>
              <StatCard title="Total Tenants" value={stats?.tenants || 0} icon={Users} color="blue" />
            </motion.div>
            <motion.div variants={staggerItem} transition={defaultTransition}>
              <StatCard title="Total Storage" value={storage.value} suffix={storage.suffix} icon={HardDrive} color="purple" decimals={2} />
            </motion.div>
            <motion.div variants={staggerItem} transition={defaultTransition}>
              <StatCard title="Total Buckets" value={stats?.buckets || 0} icon={Database} color="emerald" />
            </motion.div>
            <motion.div variants={staggerItem} transition={defaultTransition}>
              <StatCard title="Total Objects" value={stats?.objects || 0} icon={Activity} color="orange" />
            </motion.div>
          </>
        )}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* System health */}
        <div className="rounded-xl border border-border/50 bg-card p-6">
          <h2 className="font-semibold text-foreground mb-4">System Health</h2>
          <div className="space-y-4">
            {[
              { service: "API Gateway", latency: "—" },
              { service: "MinIO Cluster", latency: "—" },
              { service: "PostgreSQL", latency: "—" },
            ].map(({ service, latency }) => (
              <div key={service} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 pulse-glow" />
                  <span className="text-sm text-foreground">{service}</span>
                </div>
                <span className="text-xs font-mono text-muted-foreground">{latency}</span>
              </div>
            ))}
          </div>
          <div className="mt-6 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-xs font-medium text-emerald-400">All systems operational</span>
            </div>
          </div>
        </div>

        {/* Recent tenants */}
        <div className="lg:col-span-2 rounded-xl border border-border/50 bg-card overflow-hidden">
          <div className="p-5 border-b border-border/30 flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Recent Tenants</h2>
            <a href="/admin/tenants" className="text-sm text-blue-400 hover:text-blue-300 transition-colors">View all →</a>
          </div>
          {loading ? (
            <div className="divide-y divide-border/20">
              {[1, 2, 3].map((i) => <div key={i} className="h-14 mx-5 my-2 bg-muted/20 rounded animate-pulse" />)}
            </div>
          ) : tenants.length === 0 ? (
            <div className="py-12 flex items-center justify-center text-muted-foreground/40 text-sm">No tenants yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/30 bg-muted/20">
                    {["Tenant", "Plan", "Status", "Buckets", "Joined"].map((h) => (
                      <th key={h} className="h-11 px-5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tenants.map((t, i) => (
                    <motion.tr
                      key={t.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="border-b border-border/20 hover:bg-muted/10 transition-colors"
                    >
                      <td className="h-14 px-5">
                        <div>
                          <p className="font-medium text-foreground">{t.name}</p>
                          <p className="text-xs text-muted-foreground">{t.email}</p>
                        </div>
                      </td>
                      <td className="px-5"><BadgeStatus status={t.plan} /></td>
                      <td className="px-5"><BadgeStatus status={t.status} /></td>
                      <td className="px-5 font-mono text-muted-foreground text-xs">{t._count?.buckets ?? 0}</td>
                      <td className="px-5 text-muted-foreground text-xs">{timeAgo(t.createdAt)}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
