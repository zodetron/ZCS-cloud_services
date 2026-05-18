"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Server, Database, Zap, Activity, Cpu, HardDrive, RefreshCw, Clock } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { api } from "@/lib/api";

const POLL_MS = 5000;
const HISTORY = 20;

function formatBytes(bytes) {
  const b = Number(bytes);
  if (b >= 1e9) return `${(b / 1e9).toFixed(1)} GB`;
  if (b >= 1e6) return `${(b / 1e6).toFixed(1)} MB`;
  return `${(b / 1e3).toFixed(0)} KB`;
}

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${Math.floor(seconds % 60)}s`;
}

const serviceIcons = {
  "API Server": Zap,
  "PostgreSQL": Server,
  "Redis": Database,
  "Object Storage": HardDrive,
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border/50 bg-card p-3 shadow-xl text-xs">
      <p className="text-muted-foreground mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {typeof p.value === "number" ? p.value.toFixed(1) : p.value}%
        </p>
      ))}
    </div>
  );
};

export default function InfrastructurePage() {
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await api.get("/api/admin/infrastructure");
      setData(res);
      setLastUpdated(new Date());
      setError(null);
      setHistory((prev) => {
        const point = {
          t: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
          cpu: res.system.cpuPercent,
          memory: res.system.memoryPercent,
        };
        const next = [...prev, point];
        return next.slice(-HISTORY);
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
    const id = setInterval(fetchMetrics, POLL_MS);
    return () => clearInterval(id);
  }, [fetchMetrics]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        <RefreshCw className="w-4 h-4 animate-spin mr-2" /> Fetching live metrics…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-sm text-destructive">
        Failed to load infrastructure metrics: {error}
      </div>
    );
  }

  const { system, storage, services } = data;

  const gauges = [
    { label: "CPU Usage", value: system.cpuPercent, detail: `${system.cpuCores} cores · load ${system.loadAvg1m}`, color: "#3b82f6" },
    { label: "System Memory", value: system.memoryPercent, detail: `${formatBytes(system.memoryUsedBytes)} / ${formatBytes(system.memoryTotalBytes)}`, color: "#a855f7" },
    { label: "Heap Memory", value: +((system.heapUsedBytes / system.heapTotalBytes) * 100).toFixed(1), detail: `${formatBytes(system.heapUsedBytes)} / ${formatBytes(system.heapTotalBytes)}`, color: "#10b981" },
  ];

  const infoCards = [
    { label: "Process Uptime", value: formatUptime(system.processUptimeSeconds), icon: Clock },
    { label: "Node.js", value: system.nodeVersion, icon: Zap },
    { label: "Platform", value: system.platform, icon: Server },
    { label: "Total Objects", value: Number(storage.objectCount).toLocaleString(), icon: Database },
    { label: "Total Buckets", value: Number(storage.bucketCount).toLocaleString(), icon: HardDrive },
    { label: "Storage Used", value: formatBytes(storage.totalObjectBytes), icon: Activity },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <div className="flex items-start justify-between">
        <PageHeader
          title="Infrastructure"
          description="Live platform health — refreshes every 5 seconds."
          badge="Live"
        />
        {lastUpdated && (
          <p className="text-xs text-muted-foreground mt-1">
            Updated {lastUpdated.toLocaleTimeString()}
          </p>
        )}
      </div>

      {/* Gauges */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {gauges.map(({ label, value, detail, color }) => (
          <div key={label} className="rounded-xl border border-border/50 bg-card p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-muted-foreground">{label}</p>
              <span className="text-xl font-bold text-foreground font-mono">{value.toFixed(1)}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-2">
              <motion.div
                animate={{ width: `${value}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="h-full rounded-full"
                style={{ backgroundColor: color }}
              />
            </div>
            <p className="text-xs text-muted-foreground font-mono">{detail}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="rounded-xl border border-border/50 bg-card p-6">
        <h2 className="font-semibold text-foreground mb-1">Resource Utilization</h2>
        <p className="text-sm text-muted-foreground mb-6">
          CPU & memory over the last {history.length} samples (live)
        </p>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={history}>
            <defs>
              {[{ id: "cpu", color: "#3b82f6" }, { id: "memory", color: "#a855f7" }].map(({ id, color }) => (
                <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="t" tick={{ fontSize: 10, fill: "#888" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
            <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#888" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="cpu" name="CPU" stroke="#3b82f6" fill="url(#cpu)" strokeWidth={1.5} dot={false} />
            <Area type="monotone" dataKey="memory" name="Memory" stroke="#a855f7" fill="url(#memory)" strokeWidth={1.5} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Service health */}
      <div>
        <h2 className="font-semibold text-foreground mb-4">Service Health</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {services.map((svc) => {
            const Icon = serviceIcons[svc.name] || Server;
            const healthy = svc.status === "healthy";
            return (
              <div key={svc.name} className="p-5 rounded-xl border border-border/50 bg-card">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    <p className="text-sm font-medium text-foreground">{svc.name}</p>
                  </div>
                  <div className={`w-2 h-2 rounded-full ${healthy ? "bg-emerald-400 pulse-glow" : "bg-red-400"}`} />
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className={healthy ? "text-emerald-400" : "text-red-400"}>
                    {healthy ? "Healthy" : "Unhealthy"}
                  </span>
                  <span className="font-mono">{svc.latencyMs}ms</span>
                </div>
                {svc.error && (
                  <p className="text-xs text-red-400 mt-2 truncate">{svc.error}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* System info */}
      <div>
        <h2 className="font-semibold text-foreground mb-4">System Info</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {infoCards.map(({ label, value, icon: Icon }) => (
            <div key={label} className="p-4 rounded-xl border border-border/50 bg-card">
              <Icon className="w-4 h-4 text-muted-foreground mb-2" />
              <p className="text-xs text-muted-foreground mb-1">{label}</p>
              <p className="text-sm font-semibold text-foreground font-mono">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
