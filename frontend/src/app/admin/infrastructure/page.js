"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Server, Database, Zap, Activity, HardDrive, Cpu } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

function generateMetric(base, variance = 10) {
  return Math.max(0, Math.min(100, base + (Math.random() - 0.5) * variance));
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border/50 bg-card p-3 shadow-xl text-xs">
      <p className="text-muted-foreground mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}%</p>
      ))}
    </div>
  );
};

export default function InfrastructurePage() {
  const [metrics, setMetrics] = useState(() =>
    Array.from({ length: 20 }, (_, i) => ({
      t: `${i}s`,
      cpu: generateMetric(35),
      memory: generateMetric(62),
      disk: generateMetric(45),
    }))
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics((prev) => {
        const next = [...prev.slice(1), {
          t: "now",
          cpu: generateMetric(35),
          memory: generateMetric(62),
          disk: generateMetric(45),
        }];
        return next.map((m, i) => ({ ...m, t: `${next.length - 1 - i}s` }));
      });
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  const latest = metrics[metrics.length - 1];

  const services = [
    { name: "API Gateway", nodes: 3, healthy: 3, region: "us-east-1", icon: Zap, color: "blue" },
    { name: "MinIO Cluster", nodes: 5, healthy: 5, region: "multi", icon: Database, color: "purple" },
    { name: "PostgreSQL Primary", nodes: 1, healthy: 1, region: "us-east-1", icon: Server, color: "emerald" },
    { name: "PostgreSQL Replica", nodes: 2, healthy: 2, region: "multi", icon: Server, color: "emerald" },
    { name: "Redis Cluster", nodes: 3, healthy: 3, region: "us-east-1", icon: Zap, color: "orange" },
    { name: "BullMQ Workers", nodes: 4, healthy: 4, region: "us-east-1", icon: Activity, color: "blue" },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <PageHeader title="Infrastructure" description="Real-time platform health monitoring." badge="Live" />

      {/* Live metrics */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "CPU Usage", value: latest.cpu, key: "cpu", color: "#3b82f6" },
          { label: "Memory", value: latest.memory, key: "memory", color: "#a855f7" },
          { label: "Disk I/O", value: latest.disk, key: "disk", color: "#10b981" },
        ].map(({ label, value, key, color }) => (
          <div key={key} className="rounded-xl border border-border/50 bg-card p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-muted-foreground">{label}</p>
              <span className="text-xl font-bold text-foreground font-mono">{value.toFixed(1)}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <motion.div
                animate={{ width: `${value}%` }}
                transition={{ duration: 0.5 }}
                className="h-full rounded-full"
                style={{ backgroundColor: color }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="rounded-xl border border-border/50 bg-card p-6">
        <h2 className="font-semibold text-foreground mb-1">Resource Utilization</h2>
        <p className="text-sm text-muted-foreground mb-6">Real-time system metrics</p>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={metrics}>
            <defs>
              {[
                { id: "cpu", color: "#3b82f6" },
                { id: "memory", color: "#a855f7" },
              ].map(({ id, color }) => (
                <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="t" tick={{ fontSize: 10, fill: '#888' }} axisLine={false} tickLine={false} reversed />
            <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#888' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="cpu" name="CPU" stroke="#3b82f6" fill="url(#cpu)" strokeWidth={1.5} dot={false} />
            <Area type="monotone" dataKey="memory" name="Memory" stroke="#a855f7" fill="url(#memory)" strokeWidth={1.5} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Service grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map((service) => (
          <div key={service.name} className="p-5 rounded-xl border border-border/50 bg-card">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <service.icon className={`w-4 h-4 text-${service.color}-400`} />
                <p className="text-sm font-medium text-foreground">{service.name}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-400 pulse-glow" />
                <span className="text-xs text-emerald-400">Healthy</span>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{service.healthy}/{service.nodes} nodes</span>
              <span className="font-mono">{service.region}</span>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
