"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { Users, Search, Ban, CheckCircle, RefreshCw, ChevronDown } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { BadgeStatus } from "@/components/ui/badge-status";
import { EmptyState } from "@/components/ui/empty-state";
import { api } from "@/lib/api";

const PLANS = ["free", "pro", "enterprise"];

const PLAN_STYLES = {
  free:       "border-zinc-500/30 text-zinc-400 hover:bg-zinc-500/10",
  pro:        "border-blue-500/30 text-blue-400 hover:bg-blue-500/10",
  enterprise: "border-purple-500/30 text-purple-400 hover:bg-purple-500/10",
};

function PlanDropdown({ tenant, onPlanChange }) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const [saving, setSaving] = useState(false);
  const btnRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (btnRef.current && !btnRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function toggle() {
    if (!open) {
      const rect = btnRef.current.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX });
    }
    setOpen((v) => !v);
  }

  async function select(plan) {
    if (plan === tenant.plan) { setOpen(false); return; }
    setSaving(true);
    setOpen(false);
    try {
      await api.patch(`/api/admin/tenants/${tenant.id}/plan`, { plan });
      onPlanChange(tenant.id, plan);
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        ref={btnRef}
        onClick={toggle}
        disabled={saving}
        className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-all disabled:opacity-50 ${PLAN_STYLES[tenant.plan] ?? PLAN_STYLES.free}`}
      >
        {saving ? <RefreshCw className="w-3 h-3 animate-spin" /> : null}
        <span className="capitalize">{tenant.plan}</span>
        <ChevronDown className="w-3 h-3 opacity-60" />
      </button>
      {open && createPortal(
        <div
          style={{ position: "absolute", top: menuPos.top, left: menuPos.left, zIndex: 9999 }}
          className="w-32 rounded-lg border border-border/50 bg-card shadow-xl overflow-hidden"
        >
          {PLANS.map((p) => (
            <button
              key={p}
              onMouseDown={(e) => { e.preventDefault(); select(p); }}
              className={`w-full text-left px-3 py-2 text-xs capitalize transition-colors hover:bg-muted/30 ${p === tenant.plan ? "text-foreground font-medium" : "text-muted-foreground"}`}
            >
              {p}
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}

const GB = 1024 * 1024 * 1024;

function formatStorage(bytes) {
  const n = Number(bytes);
  if (!n) return "0 B";
  if (n >= GB * 1024) return `${(n / (GB * 1024)).toFixed(2)} TB`;
  if (n >= GB) return `${(n / GB).toFixed(2)} GB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default function TenantsPage() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [toggling, setToggling] = useState(null);

  function handlePlanChange(id, plan) {
    setTenants((prev) => prev.map((t) => t.id === id ? { ...t, plan } : t));
  }

  const load = useCallback(async (q = "") => {
    try {
      const data = await api.get(`/api/admin/tenants?limit=50${q ? `&search=${encodeURIComponent(q)}` : ""}`);
      setTenants(data.tenants || []);
    } catch {
      // keep existing
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const id = setTimeout(() => load(search), 300);
    return () => clearTimeout(id);
  }, [search, load]);

  async function toggleStatus(tenant) {
    setToggling(tenant.id);
    const newStatus = tenant.status === "active" ? "suspended" : "active";
    try {
      await api.patch(`/api/admin/tenants/${tenant.id}/status`, { status: newStatus });
      setTenants((prev) => prev.map((t) => t.id === tenant.id ? { ...t, status: newStatus } : t));
    } catch {
      // ignore
    } finally {
      setToggling(null);
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHeader title="Tenants" description="Manage all platform tenants." />

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email..."
          className="w-full h-10 pl-9 pr-4 rounded-lg border border-border/50 bg-card/50 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
        />
      </div>

      {loading ? (
        <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
          <div className="divide-y divide-border/20">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4 animate-pulse">
                <div className="w-8 h-8 rounded-full bg-muted shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-muted rounded w-1/3" />
                  <div className="h-2.5 bg-muted rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : tenants.length === 0 ? (
        <EmptyState icon={Users} title="No tenants found" description="No tenants match your search." />
      ) : (
        <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30 bg-muted/20">
                  {["Tenant", "Plan", "Status", "Buckets", "Events", "Joined", "Actions"].map((h) => (
                    <th key={h} className="h-11 px-5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tenants.map((tenant, i) => (
                  <motion.tr
                    key={tenant.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="border-b border-border/20 hover:bg-muted/10 transition-colors"
                  >
                    <td className="h-14 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                          {tenant.name[0]}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{tenant.name}</p>
                          <p className="text-xs text-muted-foreground">{tenant.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5"><PlanDropdown tenant={tenant} onPlanChange={handlePlanChange} /></td>
                    <td className="px-5"><BadgeStatus status={tenant.status} /></td>
                    <td className="px-5 font-mono text-muted-foreground text-xs">{tenant._count?.buckets ?? 0}</td>
                    <td className="px-5 font-mono text-muted-foreground text-xs">{(tenant._count?.usageEvents ?? 0).toLocaleString()}</td>
                    <td className="px-5 text-muted-foreground text-xs whitespace-nowrap">{new Date(tenant.createdAt).toLocaleDateString()}</td>
                    <td className="px-5">
                      <button
                        onClick={() => toggleStatus(tenant)}
                        disabled={toggling === tenant.id}
                        className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-all disabled:opacity-50 ${
                          tenant.status === "active"
                            ? "border-red-500/20 text-red-400 hover:bg-red-500/10"
                            : "border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10"
                        }`}
                      >
                        {toggling === tenant.id ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : tenant.status === "active" ? (
                          <><Ban className="w-3 h-3" /> Suspend</>
                        ) : (
                          <><CheckCircle className="w-3 h-3" /> Activate</>
                        )}
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </motion.div>
  );
}
