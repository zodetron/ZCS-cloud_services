"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BarChart3, TrendingUp, Download, Upload, Activity, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { api } from "@/lib/api";

const GB = 1024 * 1024 * 1024;
const MB = 1024 * 1024;

function toGB(bytes) { return Number(bytes) / GB; }
function toMB(bytes) { return Number(bytes) / MB; }

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border/50 bg-card p-3 shadow-xl text-xs">
      <p className="text-muted-foreground mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }} className="font-medium">
          {p.name}: {typeof p.value === "number" ? p.value.toLocaleString() : p.value}
        </p>
      ))}
    </div>
  );
};

export default function AnalyticsPage() {
  const [summary, setSummary] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [s, h] = await Promise.all([
          api.get("/api/usage/summary"),
          api.get("/api/usage/history?months=6"),
        ]);
        setSummary(s);
        setHistory(
          [...(h.history || [])].reverse().map((item) => ({
            month: item.period?.slice(0, 7) || item.period,
            upload: +toMB(item.uploadBytes).toFixed(1),
            download: +toMB(item.downloadBytes).toFixed(1),
            storage: +toGB(item.storageBytes).toFixed(2),
            requests: Number(item.requestCount),
          }))
        );
      } catch {
        // keep empty
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const storageGB = summary ? toGB(summary.storageBytes) : 0;
  const uploadGB = summary ? toGB(summary.uploadBytes) : 0;
  const downloadGB = summary ? toGB(summary.downloadBytes) : 0;
  const requests = summary?.requestCount || 0;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <PageHeader
        title="Analytics"
        description="Usage trends and storage metrics."
        badge="This month"
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-xl border border-border/30 bg-card animate-pulse" />
          ))
        ) : (
          <>
            <StatCard title="Total Requests" value={requests} icon={Activity} color="blue" />
            <StatCard title="Upload" value={+uploadGB.toFixed(2)} suffix=" GB" icon={Upload} color="purple" decimals={2} />
            <StatCard title="Download" value={+downloadGB.toFixed(2)} suffix=" GB" icon={Download} color="emerald" decimals={2} />
            <StatCard title="Storage Used" value={+storageGB.toFixed(2)} suffix=" GB" icon={TrendingUp} color="orange" decimals={2} />
          </>
        )}
      </div>

      {/* Bandwidth chart */}
      <div className="rounded-xl border border-border/50 bg-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-semibold text-foreground">Bandwidth Over Time</h2>
            <p className="text-sm text-muted-foreground">Upload vs download (MB)</p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5"><div className="w-3 h-1 rounded bg-blue-500" /> Upload</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-1 rounded bg-purple-500" /> Download</div>
          </div>
        </div>
        {loading ? (
          <div className="h-60 bg-muted/20 rounded-lg animate-pulse" />
        ) : history.length === 0 ? (
          <div className="h-60 flex items-center justify-center text-muted-foreground/40 text-sm">No history yet</div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={history}>
              <defs>
                <linearGradient id="uploadGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="downloadGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#888" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#888" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="upload" name="Upload (MB)" stroke="#3b82f6" fill="url(#uploadGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="download" name="Download (MB)" stroke="#a855f7" fill="url(#downloadGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Requests by month */}
        <div className="rounded-xl border border-border/50 bg-card p-6">
          <h2 className="font-semibold text-foreground mb-1">API Requests</h2>
          <p className="text-sm text-muted-foreground mb-6">Monthly request volume</p>
          {loading ? (
            <div className="h-48 bg-muted/20 rounded-lg animate-pulse" />
          ) : history.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground/40 text-sm">No history yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={history} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#888" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#888" }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="requests" name="Requests" fill="#3b82f6" radius={[4, 4, 0, 0]} fillOpacity={0.8} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Storage growth */}
        <div className="rounded-xl border border-border/50 bg-card p-6">
          <h2 className="font-semibold text-foreground mb-1">Storage Growth</h2>
          <p className="text-sm text-muted-foreground mb-6">Total data stored (GB)</p>
          {loading ? (
            <div className="h-48 bg-muted/20 rounded-lg animate-pulse" />
          ) : history.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground/40 text-sm">No history yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#888" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#888" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="storage" name="Storage (GB)" stroke="#10b981" strokeWidth={2.5} dot={{ fill: "#10b981", r: 4, strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </motion.div>
  );
}
