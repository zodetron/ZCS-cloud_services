"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Database, HardDrive, Activity, Key, Upload, Download, Zap } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { PageHeader } from "@/components/ui/page-header";
import { staggerContainer, staggerItem, defaultTransition } from "@/lib/animations";
import { useAuthStore } from "@/store/auth";
import { api } from "@/lib/api";

const actionColors = {
  upload: "text-blue-400 bg-blue-500/10",
  download: "text-emerald-400 bg-emerald-500/10",
  delete: "text-red-400 bg-red-500/10",
  delete_object: "text-red-400 bg-red-500/10",
  delete_bucket: "text-red-400 bg-red-500/10",
  list_buckets: "text-purple-400 bg-purple-500/10",
  list_objects: "text-purple-400 bg-purple-500/10",
  create_bucket: "text-orange-400 bg-orange-500/10",
  presign_upload: "text-cyan-400 bg-cyan-500/10",
  presign_download: "text-cyan-400 bg-cyan-500/10",
};

function formatBytes(bytes) {
  const n = Number(bytes);
  if (!n) return "0 B";
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(2)} MB`;
  return `${(n / 1024 ** 3).toFixed(3)} GB`;
}

function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function DashboardPage() {
  const { tenant } = useAuthStore();
  const [usage, setUsage] = useState(null);
  const [events, setEvents] = useState([]);
  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [usageData, eventsData, keysData] = await Promise.allSettled([
          api.get("/api/usage/summary"),
          api.get("/api/usage/events?limit=8").catch(() => api.get("/api/usage/summary")),
          api.get("/api/keys"),
        ]);

        if (usageData.status === "fulfilled") setUsage(usageData.value);
        if (eventsData.status === "fulfilled" && eventsData.value?.events) {
          setEvents(eventsData.value.events);
        }
        if (keysData.status === "fulfilled") setApiKeys(keysData.value?.keys || []);
      } catch {
        // keep defaults
      } finally {
        setLoading(false);
      }
    }
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, []);

  const storageGB = usage ? Number(usage.storageBytes) / 1024 ** 3 : 0;
  const downloadGB = usage ? Number(usage.downloadBytes) / 1024 ** 3 : 0;

  const stats = [
    {
      title: "Total Storage Used",
      value: +storageGB.toFixed(3),
      suffix: " GB",
      change: 0,
      changeLabel: "this month",
      icon: HardDrive,
      color: "blue",
      decimals: 3,
    },
    {
      title: "API Requests (30d)",
      value: usage?.requestCount ?? 0,
      change: 0,
      changeLabel: "this month",
      icon: Activity,
      color: "purple",
    },
    {
      title: "Bandwidth Used",
      value: +downloadGB.toFixed(3),
      suffix: " GB",
      change: 0,
      changeLabel: "egress this month",
      icon: Download,
      color: "emerald",
      decimals: 3,
    },
    {
      title: "Active API Keys",
      value: apiKeys.length,
      change: 0,
      changeLabel: "across all projects",
      icon: Key,
      color: "orange",
    },
  ];

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="space-y-8"
    >
      <PageHeader
        title={`${greeting()}, ${tenant?.name?.split(" ")[0] || "there"}`}
        description="Here's what's happening with your storage infrastructure."
        badge="Live"
      />

      {/* Stats */}
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {stats.map((stat) => (
          <motion.div key={stat.title} variants={staggerItem} transition={defaultTransition}>
            <StatCard {...stat} />
          </motion.div>
        ))}
      </motion.div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 rounded-xl border border-border/50 bg-card overflow-hidden">
          <div className="p-6 border-b border-border/30 flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Recent Activity</h2>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live
            </span>
          </div>
          <div className="divide-y divide-border/30 min-h-[200px]">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-4 animate-pulse">
                  <div className="w-10 h-6 rounded bg-muted" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-muted rounded w-2/3" />
                    <div className="h-2.5 bg-muted rounded w-1/3" />
                  </div>
                </div>
              ))
            ) : events.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground/40 gap-2">
                <Activity className="w-8 h-8" />
                <p className="text-sm">No activity yet — try the{" "}
                  <a href="/demo" className="text-blue-400 hover:underline">API Explorer</a>
                </p>
              </div>
            ) : (
              events.map((item, i) => (
                <motion.div
                  key={item.id || i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.2 }}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-muted/20 transition-colors"
                >
                  <span className={`text-xs font-mono font-bold px-2 py-1 rounded ${actionColors[item.eventType] || "text-muted-foreground bg-muted/30"}`}>
                    {(item.eventType || "").toUpperCase().replace(/_/g, " ")}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate font-mono">
                      {item.objectKey || item.bucketName || item.eventType}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {Number(item.bytes) > 0 ? formatBytes(item.bytes) : "no payload"}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-muted-foreground/60">{timeAgo(item.createdAt)}</p>
                  </div>
                </motion.div>
              ))
            )}
          </div>
          {events.length === 0 && !loading && (
            <div className="px-6 py-3 border-t border-border/30 text-center">
              <a href="/demo" className="text-xs text-blue-400 hover:underline">
                Open API Explorer →
              </a>
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="space-y-4">
          {/* Current month cost */}
          <div className="rounded-xl border border-border/50 bg-card p-6">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-400" />
              This Month's Cost
            </h3>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-8 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {[
                  {
                    label: "Storage",
                    bytes: usage?.storageBytes || "0",
                    rate: 0.023,
                    unit: "GB",
                    color: "bg-blue-500",
                  },
                  {
                    label: "Egress",
                    bytes: usage?.downloadBytes || "0",
                    rate: 0.09,
                    unit: "GB",
                    color: "bg-emerald-500",
                  },
                ].map(({ label, bytes, rate, unit, color }) => {
                  const gb = Number(bytes) / 1024 ** 3;
                  const cost = gb * rate;
                  const pct = Math.min((gb / 10) * 100, 100);
                  return (
                    <div key={label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="text-foreground font-mono">${cost.toFixed(6)}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          className={`h-full rounded-full ${color}`}
                        />
                      </div>
                      <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                        {gb.toFixed(4)} {unit} × ${rate}/{unit}
                      </p>
                    </div>
                  );
                })}
                <div className="pt-2 border-t border-border/30 flex justify-between text-sm">
                  <span className="text-muted-foreground">Requests</span>
                  <span className="font-mono text-foreground">
                    ${(((usage?.requestCount || 0) / 1000) * 0.0004).toFixed(6)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Quick actions */}
          <div className="rounded-xl border border-border/50 bg-card p-6">
            <h3 className="font-semibold text-foreground mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: Upload, label: "Upload file", color: "text-blue-400", href: "/demo" },
                { icon: Database, label: "New bucket", color: "text-purple-400", href: "/dashboard/buckets" },
                { icon: Key, label: "New API key", color: "text-emerald-400", href: "/dashboard/api-keys" },
                { icon: Zap, label: "API Explorer", color: "text-orange-400", href: "/demo" },
              ].map(({ icon: Icon, label, color, href }) => (
                <a
                  key={label}
                  href={href}
                  className="flex flex-col items-center gap-2 p-3 rounded-lg border border-border/30 hover:bg-muted/50 hover:border-border transition-all group"
                >
                  <Icon className={`w-5 h-5 ${color}`} />
                  <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">{label}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
