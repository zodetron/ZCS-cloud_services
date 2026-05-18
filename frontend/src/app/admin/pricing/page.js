"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  CreditCard, Save, RotateCcw, Search, Trash2,
  RefreshCw, Edit2, X, HardDrive, Download, Zap,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { api } from "@/lib/api";

// ── helpers ───────────────────────────────────────────────────────────────────

const METRIC_META = {
  storage_gb:     { label: "Storage",  icon: HardDrive, color: "blue",   unit: "/ GB",       desc: "Charged on total bytes stored" },
  download_gb:    { label: "Egress",   icon: Download,  color: "violet", unit: "/ GB",       desc: "Charged on data transferred out" },
  requests_per_1k:{ label: "Requests", icon: Zap,       color: "emerald",unit: "/ 1k req",   desc: "Charged per 1,000 API calls" },
};

const COLOR = {
  blue:    { bg: "bg-blue-500/10",    ring: "ring-blue-500/20",    text: "text-blue-400",    border: "border-blue-500/20"   },
  violet:  { bg: "bg-violet-500/10",  ring: "ring-violet-500/20",  text: "text-violet-400",  border: "border-violet-500/20" },
  emerald: { bg: "bg-emerald-500/10", ring: "ring-emerald-500/20", text: "text-emerald-400", border: "border-emerald-500/20"},
};

const PLAN_BADGE = {
  free:       "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  pro:        "bg-blue-500/10 text-blue-400 border-blue-500/20",
  enterprise: "bg-purple-500/10 text-purple-400 border-purple-500/20",
};

function fmtPrice(v) { return `$${(+v).toFixed(4)}`; }
function fmtFree(rule) {
  if (rule.metric === "requests_per_1k") return `${(+rule.freeQuota * 1000).toLocaleString()} free`;
  return `${rule.freeQuota} GB free`;
}

// ── Global pricing editor (all rules at once) ─────────────────────────────────

function GlobalPricingEditor({ rules, onSaveAll }) {
  const [draft, setDraft]   = useState({});
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty]   = useState(false);

  useEffect(() => {
    const init = {};
    rules.forEach((r) => {
      init[r.metric] = { unitPrice: String(r.unitPrice), freeQuota: String(r.freeQuota) };
    });
    setDraft(init);
    setDirty(false);
  }, [rules]);

  function change(metric, field, val) {
    setDraft((d) => ({ ...d, [metric]: { ...d[metric], [field]: val } }));
    setDirty(true);
  }

  function reset() {
    const init = {};
    rules.forEach((r) => {
      init[r.metric] = { unitPrice: String(r.unitPrice), freeQuota: String(r.freeQuota) };
    });
    setDraft(init);
    setDirty(false);
  }

  async function save() {
    setSaving(true);
    await onSaveAll(
      rules.map((r) => ({
        metric:    r.metric,
        unitPrice: draft[r.metric]?.unitPrice ?? r.unitPrice,
        freeQuota: draft[r.metric]?.freeQuota ?? r.freeQuota,
      }))
    );
    setSaving(false);
    setDirty(false);
  }

  const FIELDS = [
    { metric: "storage_gb",      priceLabel: "Storage ($/GB)",   quotaLabel: "Free storage (GB)",     quotaHint: "GB" },
    { metric: "download_gb",     priceLabel: "Egress ($/GB)",    quotaLabel: "Free egress (GB)",      quotaHint: "GB" },
    { metric: "requests_per_1k", priceLabel: "Requests ($/1k)",  quotaLabel: "Free requests (×1k)",   quotaHint: "×1k" },
  ];

  return (
    <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
      <div className="px-6 py-4 border-b border-border/30 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">Global rates</p>
          <p className="text-xs text-muted-foreground mt-0.5">Changes apply to all tenants unless a custom override is set</p>
        </div>
        {dirty && (
          <span className="text-xs text-amber-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse-dot inline-block" />
            Unsaved changes
          </span>
        )}
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[1fr_180px_180px] gap-4 px-6 py-2 bg-muted/10 border-b border-border/20">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Metric</span>
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Unit Price</span>
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Free Quota</span>
      </div>

      {/* Rows */}
      <div className="divide-y divide-border/20">
        {FIELDS.map(({ metric, priceLabel, quotaLabel, quotaHint }) => {
          const meta = METRIC_META[metric] ?? {};
          const c    = COLOR[meta.color] ?? COLOR.blue;
          const Icon = meta.icon ?? CreditCard;
          const d    = draft[metric] ?? {};

          return (
            <div key={metric} className="grid grid-cols-[1fr_180px_180px] gap-4 items-center px-6 py-4">
              {/* Label */}
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg ${c.bg} ring-1 ${c.ring} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-3.5 h-3.5 ${c.text}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{meta.label}</p>
                  <p className="text-xs text-muted-foreground">{meta.desc}</p>
                </div>
              </div>

              {/* Price input */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">{priceLabel}</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                  <input
                    type="number" step="0.0001" min="0"
                    value={d.unitPrice ?? ""}
                    onChange={(e) => change(metric, "unitPrice", e.target.value)}
                    className="w-full h-9 pl-6 pr-3 rounded-lg border border-border/50 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
                  />
                </div>
              </div>

              {/* Free quota input */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">{quotaLabel}</label>
                <div className="relative">
                  <input
                    type="number" step="1" min="0"
                    value={d.freeQuota ?? ""}
                    onChange={(e) => change(metric, "freeQuota", e.target.value)}
                    className="w-full h-9 px-3 pr-10 rounded-lg border border-border/50 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">{quotaHint}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="px-6 py-4 border-t border-border/30 flex items-center gap-3 bg-muted/5">
        <button
          onClick={save} disabled={saving || !dirty}
          className="flex items-center gap-2 px-5 h-9 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Save Changes
        </button>
        <button
          onClick={reset} disabled={!dirty}
          className="flex items-center gap-2 px-4 h-9 rounded-lg border border-border/50 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Reset
        </button>
      </div>
    </div>
  );
}

// ── Tenant override row ───────────────────────────────────────────────────────

function OverrideRow({ tenant, globalRules, onEdit, onRemove }) {
  const [removing, setRemoving] = useState(false);

  async function remove() {
    setRemoving(true);
    await onRemove(tenant.id);
    setRemoving(false);
  }

  const ov = tenant.pricingOverride || {};

  return (
    <tr className="border-b border-border/20 hover:bg-muted/10 transition-colors">
      <td className="h-14 px-5">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {tenant.name[0]}
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{tenant.name}</p>
            <p className="text-xs text-muted-foreground">{tenant.email}</p>
          </div>
        </div>
      </td>
      <td className="px-5">
        <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${PLAN_BADGE[tenant.plan] ?? PLAN_BADGE.free}`}>
          {tenant.plan}
        </span>
      </td>
      {["storage_gb","download_gb","requests_per_1k"].map((metric) => {
        const global = globalRules.find((r) => r.metric === metric);
        const custom = ov[metric];
        const isCustom = custom !== undefined;
        return (
          <td key={metric} className="px-5">
            <div className="flex flex-col">
              <span className={`text-xs font-mono ${isCustom ? "text-amber-400" : "text-muted-foreground"}`}>
                {fmtPrice(isCustom ? custom : (global?.unitPrice ?? 0))}
              </span>
              {isCustom && (
                <span className="text-[10px] text-muted-foreground/50">custom</span>
              )}
            </div>
          </td>
        );
      })}
      <td className="px-5">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onEdit(tenant)}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-all flex items-center gap-1"
          >
            <Edit2 className="w-3 h-3" /> Edit
          </button>
          <button
            onClick={remove} disabled={removing}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-all flex items-center gap-1 disabled:opacity-50"
          >
            {removing ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
            Remove
          </button>
        </div>
      </td>
    </tr>
  );
}

// ── Override editor panel ─────────────────────────────────────────────────────

function OverrideEditor({ tenant, globalRules, onSave, onClose }) {
  const existing = tenant.pricingOverride || {};
  const [form, setForm] = useState({
    storage_gb:      existing.storage_gb      ?? "",
    download_gb:     existing.download_gb     ?? "",
    requests_per_1k: existing.requests_per_1k ?? "",
  });
  const [saving, setSaving] = useState(false);

  function change(metric, val) {
    setForm((f) => ({ ...f, [metric]: val }));
  }

  async function save() {
    setSaving(true);
    const override = {};
    if (form.storage_gb      !== "") override.storage_gb      = +form.storage_gb;
    if (form.download_gb     !== "") override.download_gb     = +form.download_gb;
    if (form.requests_per_1k !== "") override.requests_per_1k = +form.requests_per_1k;
    await onSave(tenant.id, Object.keys(override).length ? override : null);
    setSaving(false);
  }

  const fields = [
    { metric: "storage_gb",      label: "Storage ($/GB)" },
    { metric: "download_gb",     label: "Egress ($/GB)" },
    { metric: "requests_per_1k", label: "Requests ($/1k)" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-5 space-y-4"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">Custom pricing — {tenant.name}</p>
          <p className="text-xs text-muted-foreground">Leave blank to inherit global rate</p>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {fields.map(({ metric, label }) => {
          const global = globalRules.find((r) => r.metric === metric);
          return (
            <div key={metric}>
              <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <input
                  type="number" step="0.0001" min="0"
                  value={form[metric]}
                  onChange={(e) => change(metric, e.target.value)}
                  placeholder={global ? String(global.unitPrice) : "global"}
                  className="w-full h-9 pl-6 pr-3 rounded-lg border border-border/50 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 placeholder:text-muted-foreground/40"
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-2 pt-1">
        <button
          onClick={save} disabled={saving}
          className="flex items-center gap-1.5 px-4 h-9 rounded-lg bg-amber-500 text-black text-sm font-semibold hover:bg-amber-400 disabled:opacity-50 transition-all"
        >
          {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Save Override
        </button>
        <button
          onClick={onClose}
          className="px-4 h-9 rounded-lg border border-border/50 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-all"
        >
          Cancel
        </button>
      </div>
    </motion.div>
  );
}

// ── Tenant search for adding override ────────────────────────────────────────

function AddOverrideSearch({ globalRules, existingIds, onAdd }) {
  const [query, setQuery]       = useState("");
  const [results, setResults]   = useState([]);
  const [open, setOpen]         = useState(false);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (!query.trim()) { setResults([]); setOpen(false); return; }
    const t = setTimeout(async () => {
      try {
        const data = await api.get(`/api/admin/tenants?limit=8&search=${encodeURIComponent(query)}`);
        setResults((data.tenants || []).filter((t) => !existingIds.has(t.id)));
        setOpen(true);
      } catch {}
    }, 300);
    return () => clearTimeout(t);
  }, [query, existingIds]);

  function pick(tenant) {
    setSelected({ ...tenant, pricingOverride: null });
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  async function save(id, override) {
    await onAdd(id, override);
    setSelected(null);
  }

  return (
    <div className="space-y-3">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tenant by name or email..."
          className="w-full h-10 pl-9 pr-4 rounded-lg border border-border/50 bg-card/50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
        />
        {open && results.length > 0 && (
          <div className="absolute top-full mt-1 left-0 w-full rounded-lg border border-border/50 bg-card shadow-xl z-50 overflow-hidden">
            {results.map((t) => (
              <button
                key={t.id}
                onClick={() => pick(t)}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors text-left"
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                  {t.name[0]}
                </div>
                <div>
                  <p className="text-sm text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.email}</p>
                </div>
                <span className={`ml-auto text-xs px-2 py-0.5 rounded-full border capitalize ${PLAN_BADGE[t.plan] ?? PLAN_BADGE.free}`}>
                  {t.plan}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <OverrideEditor
          tenant={selected}
          globalRules={globalRules}
          onSave={save}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PricingPage() {
  const [tab, setTab]             = useState("global");
  const [rules, setRules]         = useState([]);
  const [overrides, setOverrides] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [editingTenant, setEditingTenant] = useState(null);

  const loadAll = useCallback(async () => {
    try {
      const [g, o] = await Promise.all([
        api.get("/api/admin/pricing"),
        api.get("/api/admin/pricing/overrides"),
      ]);
      setRules(g.rules || []);
      setOverrides(o.tenants || []);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  async function saveAllRules(updates) {
    await api.put("/api/admin/pricing/global", { rules: updates });
    setRules((prev) =>
      prev.map((r) => {
        const u = updates.find((x) => x.metric === r.metric);
        return u ? { ...r, unitPrice: +u.unitPrice, freeQuota: String(u.freeQuota) } : r;
      })
    );
  }

  async function saveTenantOverride(id, pricingOverride) {
    await api.patch(`/api/admin/pricing/tenant/${id}`, { pricingOverride });
    setEditingTenant(null);
    await loadAll();
  }

  async function addTenantOverride(id, pricingOverride) {
    await api.patch(`/api/admin/pricing/tenant/${id}`, { pricingOverride });
    await loadAll();
  }

  async function removeTenantOverride(id) {
    await api.delete(`/api/admin/pricing/tenant/${id}`);
    setOverrides((prev) => prev.filter((t) => t.id !== id));
  }

  const existingIds = new Set(overrides.map((t) => t.id));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHeader
        title="Pricing"
        description="Manage global pricing rates and per-tenant custom overrides."
      />

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/30 border border-border/30 w-fit">
        {[
          { id: "global",    label: "Global Pricing" },
          { id: "overrides", label: `Tenant Overrides${overrides.length ? ` (${overrides.length})` : ""}` },
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

      {/* ── Global Pricing ── */}
      {tab === "global" && (
        <div className="space-y-6">
          {loading ? (
            <div className="h-64 rounded-xl border border-border/30 bg-card animate-pulse" />
          ) : (
            <>
              <GlobalPricingEditor rules={rules} onSaveAll={saveAllRules} />

              {/* Plan overview */}
              <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
                <div className="px-5 py-4 border-b border-border/30">
                  <p className="text-sm font-semibold text-foreground">Plan overview</p>
                  <p className="text-xs text-muted-foreground mt-0.5">All plans inherit global rates unless a tenant override is set</p>
                </div>
                <div className="divide-y divide-border/20">
                  {["free","pro","enterprise"].map((plan) => (
                    <div key={plan} className="flex items-center px-5 py-3 gap-4">
                      <span className={`text-xs px-2.5 py-1 rounded-full border capitalize w-24 text-center ${PLAN_BADGE[plan]}`}>
                        {plan}
                      </span>
                      <div className="flex-1 grid grid-cols-3 gap-4">
                        {rules.map((r) => (
                          <div key={r.metric} className="text-xs">
                            <span className="text-muted-foreground">{METRIC_META[r.metric]?.label}: </span>
                            <span className="font-mono text-foreground">{fmtPrice(r.unitPrice)}</span>
                            <span className="text-muted-foreground"> {METRIC_META[r.metric]?.unit}</span>
                          </div>
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {overrides.filter((t) => t.plan === plan).length} override{overrides.filter((t) => t.plan === plan).length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Tenant Overrides ── */}
      {tab === "overrides" && (
        <div className="space-y-4">
          <AddOverrideSearch
            globalRules={rules}
            existingIds={existingIds}
            onAdd={addTenantOverride}
          />

          {loading ? (
            <div className="h-40 rounded-xl border border-border/30 bg-card animate-pulse" />
          ) : overrides.length === 0 ? (
            <div className="rounded-xl border border-border/50 bg-card p-12 text-center">
              <CreditCard className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground">No overrides yet</p>
              <p className="text-xs text-muted-foreground mt-1">Search for a tenant above to set custom pricing</p>
            </div>
          ) : (
            <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
              {editingTenant && (
                <div className="p-4 border-b border-border/30">
                  <OverrideEditor
                    tenant={editingTenant}
                    globalRules={rules}
                    onSave={saveTenantOverride}
                    onClose={() => setEditingTenant(null)}
                  />
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/30 bg-muted/20">
                      {["Tenant","Plan","Storage","Egress","Requests","Actions"].map((h) => (
                        <th key={h} className="h-11 px-5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {overrides.map((tenant, i) => (
                      <OverrideRow
                        key={tenant.id}
                        tenant={tenant}
                        globalRules={rules}
                        onEdit={(t) => setEditingTenant(t)}
                        onRemove={removeTenantOverride}
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
