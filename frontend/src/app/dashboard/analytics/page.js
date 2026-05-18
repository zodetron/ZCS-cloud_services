"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BarChart3, TrendingUp, Download, Upload, Activity, Brain, DollarSign } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line,
} from "recharts";
import { api } from "@/lib/api";

const GB = 1024 * 1024 * 1024;
const MB = 1024 * 1024;

function toGB(bytes) { return Number(bytes) / GB; }
function toMB(bytes) { return Number(bytes) / MB; }

const CONFIDENCE_STYLE = {
  high:   "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  medium: "bg-amber-500/10  text-amber-400  border-amber-500/20",
  low:    "bg-red-500/10    text-red-400    border-red-500/20",
};

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

// ── ML prediction card ───────────────────────────────────────────────────────
function PredictionCard({ label, unit, current, predicted, confidence, isCost }) {
  const pct = predicted > 0 && current !== null
    ? Math.min(100, (current / predicted) * 100)
    : 0;

  const fmt = (v, u) =>
    u === "$"
      ? `$${Number(v).toFixed(4)}`
      : u === "GB"
      ? `${Number(v).toFixed(2)} GB`
      : Number(v).toLocaleString();

  return (
    <div className="rounded-xl border border-border/40 bg-background/40 p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${CONFIDENCE_STYLE[confidence]}`}>
          {confidence}
        </span>
      </div>

      <div>
        <p className="text-xl font-bold text-foreground">{fmt(predicted, unit)}</p>
        <p className="text-xs text-muted-foreground mt-0.5">predicted by month end</p>
      </div>

      {current !== null && (
        <>
          <div className="w-full h-1.5 rounded-full bg-muted/40 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {fmt(current, unit)} used so far &nbsp;·&nbsp; {pct.toFixed(0)}% of predicted
          </p>
        </>
      )}
    </div>
  );
}

// ── Skeleton for prediction cards while TF.js loads ─────────────────────────
function PredictionSkeleton() {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-5 h-5 rounded bg-muted/40 animate-pulse" />
        <div className="w-48 h-5 rounded bg-muted/40 animate-pulse" />
        <div className="w-24 h-5 rounded-full bg-muted/30 animate-pulse ml-auto" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border/40 bg-background/40 p-4 space-y-3">
            <div className="h-3 w-16 rounded bg-muted/40 animate-pulse" />
            <div className="h-7 w-24 rounded bg-muted/40 animate-pulse" />
            <div className="h-1.5 w-full rounded-full bg-muted/30 animate-pulse" />
            <div className="h-3 w-32 rounded bg-muted/30 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const [summary, setSummary]     = useState(null);
  const [history, setHistory]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [prediction, setPrediction] = useState(null);  // null = loading, false = failed
  const [mlMeta, setMlMeta]       = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const [s, h] = await Promise.all([
          api.get("/api/usage/summary"),
          api.get("/api/usage/history?months=6"),
        ]);
        setSummary(s);

        const parsedHistory = [...(h.history || [])].reverse().map((item) => ({
          month:    item.period?.slice(0, 7) || item.period,
          upload:   +toMB(item.uploadBytes).toFixed(1),
          download: +toMB(item.downloadBytes).toFixed(1),
          storage:  +toGB(item.storageBytes).toFixed(2),
          requests: Number(item.requestCount),
        }));
        setHistory(parsedHistory);

        // ── Run ML in the background (dynamic import keeps TF.js out of main bundle)
        try {
          const { runMLPrediction } = await import("@/lib/ml-predictor");
          const ml = await runMLPrediction(h.history || [], s);
          setPrediction(ml.results);
          setMlMeta({ dayOfMonth: ml.dayOfMonth, daysInMonth: ml.daysInMonth });
        } catch {
          setPrediction(false);
        }
      } catch {
        // keep empty
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const storageGB  = summary ? toGB(summary.storageBytes)  : 0;
  const uploadGB   = summary ? toGB(summary.uploadBytes)   : 0;
  const downloadGB = summary ? toGB(summary.downloadBytes) : 0;
  const requests   = summary?.requestCount || 0;

  const overallConfidence = prediction
    ? prediction.storageBytes?.confidence ?? "low"
    : "low";

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <PageHeader
        title="Analytics"
        description="Usage trends and storage metrics."
        badge="This month"
      />

      {/* Current stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-xl border border-border/30 bg-card animate-pulse" />
          ))
        ) : (
          <>
            <StatCard title="Total Requests" value={requests}              icon={Activity}   color="blue"   />
            <StatCard title="Upload"          value={+uploadGB.toFixed(2)}   suffix=" GB" icon={Upload}    color="purple"  decimals={2} />
            <StatCard title="Download"        value={+downloadGB.toFixed(2)} suffix=" GB" icon={Download}  color="emerald" decimals={2} />
            <StatCard title="Storage Used"    value={+storageGB.toFixed(2)}  suffix=" GB" icon={TrendingUp} color="orange"  decimals={2} />
          </>
        )}
      </div>

      {/* ── ML Prediction section ───────────────────────────────────────────── */}
      {prediction === null && !loading && <PredictionSkeleton />}

      {prediction && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-xl border border-violet-500/20 bg-card p-6"
          style={{ boxShadow: "inset 0 1px 0 rgba(139,92,246,0.08), 0 4px 24px rgba(0,0,0,0.3)" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <Brain className="w-4 h-4 text-violet-400" />
                <h2 className="font-semibold text-foreground">End-of-Month Prediction</h2>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20 font-semibold tracking-wide">
                  TensorFlow.js
                </span>
              </div>
              {mlMeta && (
                <p className="text-sm text-muted-foreground">
                  Trained on your usage history · day {mlMeta.dayOfMonth} of {mlMeta.daysInMonth}
                </p>
              )}
            </div>
            <span className={`text-xs px-3 py-1 rounded-full border font-medium ${CONFIDENCE_STYLE[overallConfidence]}`}>
              {overallConfidence} confidence
            </span>
          </div>

          {/* Prediction cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              prediction.storageBytes,
              prediction.uploadBytes,
              prediction.downloadBytes,
              prediction.requestCount,
              prediction.cost,
            ].map((p) => (
              <PredictionCard key={p.label} {...p} />
            ))}
          </div>

          <p className="text-[11px] text-muted-foreground/40 mt-4">
            Model blends a linear regression trained on historical monthly totals with your current-month pace.
            Early in the month it weights history more; as the month progresses it shifts toward your actual rate.
            Runs entirely in your browser — no data leaves your device.
          </p>
        </motion.div>
      )}

      {prediction === false && (
        <div className="rounded-xl border border-border/40 bg-card p-5 text-sm text-muted-foreground flex items-center gap-2">
          <Brain className="w-4 h-4 shrink-0" />
          ML prediction unavailable — need at least 1 month of usage history.
        </div>
      )}

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
                  <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}   />
                </linearGradient>
                <linearGradient id="downloadGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#a855f7" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0}   />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#888" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#888" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="upload"   name="Upload (MB)"   stroke="#3b82f6" fill="url(#uploadGrad)"   strokeWidth={2} />
              <Area type="monotone" dataKey="download" name="Download (MB)" stroke="#a855f7" fill="url(#downloadGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* API Requests */}
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
                <YAxis tick={{ fontSize: 11, fill: "#888" }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
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
                <Line type="monotone" dataKey="storage" name="Storage (GB)" stroke="#10b981" strokeWidth={2.5}
                  dot={{ fill: "#10b981", r: 4, strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </motion.div>
  );
}
