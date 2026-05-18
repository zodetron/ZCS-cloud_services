"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import {
  Shield, Search, Save, RotateCcw, RefreshCw,
  Edit2, X, Check, Zap, Clock, Users, AlertTriangle,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { api } from "@/lib/api";

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtWindow(sec) {
  const s = +sec;
  if (s < 60)   return `${s}s`;
  if (s < 3600) return `${Math.round(s / 60)}m`;
  return `${(s / 3600).toFixed(1)}h`;
}

function usagePct(current, max) {
  if (!max) return 0;
  return Math.min(100, Math.round((current / max) * 100));
}

function usageColor(pct) {
  if (pct >= 90) return { bar: "bg-red-500",    text: "text-red-400" };
  if (pct >= 60) return { bar: "bg-amber-500",  text: "text-amber-400" };
  return              { bar: "bg-emerald-500", text: "text-emerald-400" };
}

const PLAN_BADGE = {
  free:       "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  pro:        "bg-blue-500/10 text-blue-400 border-blue-500/20",
  enterprise: "bg-purple-500/10 text-purple-400 border-purple-500/20",
};

// ── Global defaults panel ─────────────────────────────────────────────────────

function GlobalEditor({ defaults, onSave }) {
  const [max,     setMax]     = useState(String(defaults.max));
  const [win,     setWin]     = useState(String(defaults.window));
  const [applyTo, setApplyTo] = useState("none");
  const [saving,  setSaving]  = useState(false);
  const [dirty,   setDirty]   = useState(false);
  const [result,  setResult]  = useState(null);

  useEffect(() => {
    setMax(String(defaults.max));
    setWin(String(defaults.window));
    setDirty(false);
  }, [defaults]);

  function change(setter) {
    return (e) => { setter(e.target.value); setDirty(true); setResult(null); };
  }

  async function save() {
    setSaving(true);
    setResult(null);
    const res = await onSave({ max: +max, window: +win, applyTo });
    setSaving(false);
    setDirty(false);
    setResult(res);
  }

  const APPLY_OPTIONS = [
    { value: "none",       label: "Save defaults only",        desc: "No existing tenants are changed" },
    { value: "all",        label: "Apply to all tenants",      desc: "Overrides every tenant immediately" },
    { value: "free",       label: "Apply to Free plan",        desc: "Only tenants on the free plan" },
    { value: "pro",        label: "Apply to Pro plan",         desc: "Only tenants on the pro plan" },
    { value: "enterprise", label: "Apply to Enterprise plan",  desc: "Only tenants on the enterprise plan" },
  ];

  return (
    <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
      <div className="px-6 py-4 border-b border-border/30 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">Global rate limit defaults</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Set the platform defaults and optionally push them to existing tenants
          </p>
        </div>
        {dirty && (
          <span className="text-xs text-amber-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse-dot inline-block" />
            Unsaved changes
          </span>
        )}
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-2 gap-6 px-6 py-2 bg-muted/10 border-b border-border/20">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Max requests per window</span>
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Window size (seconds)</span>
      </div>

      {/* Inputs row */}
      <div className="grid grid-cols-2 gap-6 px-6 py-5 border-b border-border/20">
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block flex items-center gap-1.5">
            <Zap className="w-3 h-3" /> Requests / window
          </label>
          <div className="relative">
            <input
              type="number" min="1" max="1000000" step="100"
              value={max}
              onChange={change(setMax)}
              className="w-full h-10 px-4 rounded-lg border border-border/50 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">req</span>
          </div>
          <p className="text-xs text-muted-foreground/50 mt-1">Max: 1,000,000 — Default: 1,000</p>
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block flex items-center gap-1.5">
            <Clock className="w-3 h-3" /> Window duration
          </label>
          <div className="relative">
            <input
              type="number" min="1" max="86400" step="1"
              value={win}
              onChange={change(setWin)}
              className="w-full h-10 px-4 pr-16 rounded-lg border border-border/50 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
              sec {win && +win >= 1 ? `(${fmtWindow(win)})` : ""}
            </span>
          </div>
          <p className="text-xs text-muted-foreground/50 mt-1">Max: 86,400s (24h) — Default: 60s</p>
        </div>
      </div>

      {/* Apply to selector */}
      <div className="px-6 py-5 border-b border-border/20">
        <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">Apply to</p>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
          {APPLY_OPTIONS.map(({ value, label, desc }) => (
            <button
              key={value}
              onClick={() => setApplyTo(value)}
              className={`p-3 rounded-lg border text-left transition-all ${
                applyTo === value
                  ? "border-blue-500/50 bg-blue-500/10 text-blue-400"
                  : "border-border/50 text-muted-foreground hover:border-border hover:bg-muted/20 hover:text-foreground"
              }`}
            >
              <p className="text-xs font-medium leading-tight">{label}</p>
              <p className="text-[10px] mt-0.5 opacity-60 leading-tight">{desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="px-6 py-4 bg-muted/5 flex items-center gap-3">
        <button
          onClick={save} disabled={saving || !dirty}
          className="flex items-center gap-2 px-5 h-9 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Save
        </button>
        {result && (
          <span className="text-xs text-emerald-400">
            {result.applied > 0 ? `✓ Applied to ${result.applied} tenant${result.applied !== 1 ? "s" : ""}` : "✓ Defaults saved"}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Tenant row (table) ────────────────────────────────────────────────────────

function TenantRow({ tenant, onSave, onReset }) {
  const [editing,  setEditing]  = useState(false);
  const [max,      setMax]      = useState(String(tenant.rateLimitMax));
  const [win,      setWin]      = useState(String(tenant.rateLimitWindow));
  const [saving,   setSaving]   = useState(false);
  const [resetting,setResetting]= useState(false);

  const pct = usagePct(tenant.currentUsage, tenant.rateLimitMax);
  const col = usageColor(pct);

  function cancel() {
    setMax(String(tenant.rateLimitMax));
    setWin(String(tenant.rateLimitWindow));
    setEditing(false);
  }

  async function save() {
    setSaving(true);
    await onSave(tenant.id, { rateLimitMax: +max, rateLimitWindow: +win });
    setSaving(false);
    setEditing(false);
  }

  async function reset() {
    setResetting(true);
    await onReset(tenant.id);
    setResetting(false);
  }

  return (
    <>
      <tr className="border-b border-border/20 hover:bg-muted/10 transition-colors">
        {/* Tenant */}
        <td className="h-14 px-5">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {tenant.name[0]}
            </div>
            <div>
              <p className="text-sm font-medium text-foreground leading-tight">{tenant.name}</p>
              <p className="text-xs text-muted-foreground">{tenant.email}</p>
            </div>
          </div>
        </td>

        {/* Plan */}
        <td className="px-5">
          <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${PLAN_BADGE[tenant.plan] ?? PLAN_BADGE.free}`}>
            {tenant.plan}
          </span>
        </td>

        {/* Live usage */}
        <td className="px-5 min-w-[140px]">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className={`text-xs font-mono font-medium ${col.text}`}>
                {tenant.currentUsage} / {tenant.rateLimitMax}
              </span>
              <span className="text-[10px] text-muted-foreground">{pct}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${col.bar}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            {tenant.windowResetIn > 0 && (
              <p className="text-[10px] text-muted-foreground/50">resets in {fmtWindow(tenant.windowResetIn)}</p>
            )}
          </div>
        </td>

        {/* Limit */}
        <td className="px-5">
          <span className="text-xs font-mono text-foreground">{tenant.rateLimitMax.toLocaleString()}</span>
          <span className="text-xs text-muted-foreground"> req</span>
        </td>

        {/* Window */}
        <td className="px-5">
          <span className="text-xs font-mono text-foreground">{fmtWindow(tenant.rateLimitWindow)}</span>
        </td>

        {/* Actions */}
        <td className="px-5">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setEditing((v) => !v)}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-all flex items-center gap-1"
            >
              {editing ? <><X className="w-3 h-3" /> Cancel</> : <><Edit2 className="w-3 h-3" /> Edit</>}
            </button>
            <button
              onClick={reset} disabled={resetting || tenant.currentUsage === 0}
              title="Reset live counter"
              className="text-xs px-2.5 py-1.5 rounded-lg border border-amber-500/20 text-amber-400 hover:bg-amber-500/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-1"
            >
              {resetting ? <RefreshCw className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
              Reset
            </button>
          </div>
        </td>
      </tr>

      {/* Inline edit row */}
      {editing && (
        <tr className="border-b border-border/20 bg-blue-500/[0.03]">
          <td colSpan={6} className="px-5 py-3">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground whitespace-nowrap">Max requests</label>
                <input
                  type="number" min="1" max="1000000" step="100"
                  value={max}
                  onChange={(e) => setMax(e.target.value)}
                  className="w-32 h-8 px-3 rounded-lg border border-border/50 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground whitespace-nowrap">Window (sec)</label>
                <div className="relative">
                  <input
                    type="number" min="1" max="86400"
                    value={win}
                    onChange={(e) => setWin(e.target.value)}
                    className="w-28 h-8 px-3 pr-10 rounded-lg border border-border/50 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">{fmtWindow(win)}</span>
                </div>
              </div>
              <div className="flex gap-2 ml-auto">
                <button
                  onClick={save} disabled={saving}
                  className="flex items-center gap-1.5 px-3 h-8 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-500 disabled:opacity-50 transition-all"
                >
                  {saving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                  Save
                </button>
                <button
                  onClick={cancel}
                  className="px-3 h-8 rounded-lg border border-border/50 text-xs text-muted-foreground hover:bg-muted/30 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function RateLimitsPage() {
  const [tab,      setTab]      = useState("global");
  const [defaults, setDefaults] = useState({ max: 1000, window: 60 });
  const [tenants,  setTenants]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const loadAll = useCallback(async () => {
    try {
      const [d, t] = await Promise.all([
        api.get("/api/admin/rate-limits/defaults"),
        api.get("/api/admin/rate-limits"),
      ]);
      setDefaults(d.defaults);
      setTenants(t.tenants || []);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  async function refresh() {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  }

  async function saveDefaults(payload) {
    const res = await api.put("/api/admin/rate-limits/defaults", payload);
    setDefaults({ max: payload.max, window: payload.window });
    if (payload.applyTo !== "none") await loadAll();
    return res;
  }

  async function saveTenant(id, data) {
    await api.patch(`/api/admin/rate-limits/${id}`, data);
    setTenants((prev) =>
      prev.map((t) => t.id === id ? { ...t, ...data } : t)
    );
  }

  async function resetCounter(id) {
    await api.post(`/api/admin/rate-limits/${id}/reset`, {});
    setTenants((prev) =>
      prev.map((t) => t.id === id ? { ...t, currentUsage: 0, windowResetIn: 0 } : t)
    );
  }

  const filtered = tenants.filter((t) => {
    const q = search.toLowerCase();
    return !q || t.name.toLowerCase().includes(q) || t.email.toLowerCase().includes(q);
  });

  const throttledCount = tenants.filter((t) => usagePct(t.currentUsage, t.rateLimitMax) >= 90).length;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHeader
        title="Rate Limits"
        description="Set global defaults and per-tenant overrides."
      />

      {/* Summary chips */}
      {!loading && (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border/30 bg-card text-xs text-muted-foreground">
            <Users className="w-3.5 h-3.5" />
            {tenants.length} tenants
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border/30 bg-card text-xs text-muted-foreground">
            <Zap className="w-3.5 h-3.5" />
            Global default: {defaults.max.toLocaleString()} req / {fmtWindow(defaults.window)}
          </div>
          {throttledCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-red-500/20 bg-red-500/5 text-xs text-red-400">
              <AlertTriangle className="w-3.5 h-3.5" />
              {throttledCount} tenant{throttledCount !== 1 ? "s" : ""} near limit
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/30 border border-border/30 w-fit">
        {[
          { id: "global",  label: "Global Defaults" },
          { id: "tenants", label: `Tenants (${tenants.length})` },
        ].map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              tab === id
                ? "bg-background text-foreground shadow-sm border border-border/50"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Global tab ── */}
      {tab === "global" && (
        loading
          ? <div className="h-72 rounded-xl border border-border/30 bg-card animate-pulse" />
          : <GlobalEditor defaults={defaults} onSave={saveDefaults} />
      )}

      {/* ── Tenants tab ── */}
      {tab === "tenants" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full h-10 pl-9 pr-4 rounded-lg border border-border/50 bg-card/50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
              />
            </div>
            <button
              onClick={refresh} disabled={refreshing}
              className="flex items-center gap-2 px-3 h-10 rounded-lg border border-border/50 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/30 disabled:opacity-50 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="rounded-xl border border-border/30 bg-card overflow-hidden divide-y divide-border/20">
              {[1,2,3,4].map((i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-4 animate-pulse">
                  <div className="w-7 h-7 rounded-full bg-muted shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-muted rounded w-1/4" />
                    <div className="h-2 bg-muted rounded w-1/3" />
                  </div>
                  <div className="h-8 w-40 bg-muted rounded-lg" />
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/30 bg-muted/20">
                      {["Tenant", "Plan", "Live Usage", "Limit", "Window", "Actions"].map((h) => (
                        <th key={h} className="h-11 px-5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                          No tenants match your search
                        </td>
                      </tr>
                    ) : filtered.map((tenant) => (
                      <TenantRow
                        key={tenant.id}
                        tenant={tenant}
                        onSave={saveTenant}
                        onReset={resetCounter}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
