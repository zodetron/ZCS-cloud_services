"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FileText, Search, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { api } from "@/lib/api";

const actionColors = {
  TENANT_SUSPENDED:  "text-red-400 bg-red-500/10",
  TENANT_ACTIVATED:  "text-emerald-400 bg-emerald-500/10",
  TENANT_CREATED:    "text-emerald-400 bg-emerald-500/10",
  PRICING_UPDATED:   "text-orange-400 bg-orange-500/10",
  API_KEY_REVOKED:   "text-yellow-400 bg-yellow-500/10",
  API_KEY_CREATED:   "text-blue-400 bg-blue-500/10",
  BUCKET_CREATED:    "text-blue-400 bg-blue-500/10",
  BUCKET_DELETED:    "text-red-400 bg-red-500/10",
  LOGIN_SUCCESS:     "text-emerald-400 bg-emerald-500/10",
  RATE_LIMIT_HIT:    "text-red-400 bg-red-500/10",
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const data = await api.get("/api/admin/audit-logs?limit=100");
        setLogs(data.logs || []);
      } catch {
        // keep empty
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = logs.filter((l) =>
    !search ||
    l.action?.includes(search.toUpperCase()) ||
    l.tenantId?.toLowerCase().includes(search.toLowerCase()) ||
    l.resource?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHeader title="Audit Logs" description="Complete trail of all platform actions." />

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter logs..."
          className="w-full h-10 pl-9 pr-4 rounded-lg border border-border/50 bg-card/50 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
        />
      </div>

      <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
        <div className="p-4 border-b border-border/30 flex items-center gap-2">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground font-mono">{filtered.length} log entries</span>
          {loading && <RefreshCw className="w-3.5 h-3.5 text-muted-foreground animate-spin ml-auto" />}
        </div>

        <div className="divide-y divide-border/20 max-h-[600px] overflow-y-auto">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4 animate-pulse">
                <div className="w-24 h-6 rounded bg-muted shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-muted rounded w-1/2" />
                  <div className="h-2.5 bg-muted rounded w-1/3" />
                </div>
              </div>
            ))
          ) : filtered.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center gap-2 text-muted-foreground/40">
              <FileText className="w-8 h-8" />
              <p className="text-sm">No audit logs yet</p>
            </div>
          ) : (
            filtered.map((log, i) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.02 }}
                className="flex items-center gap-4 px-5 py-4 hover:bg-muted/10 transition-colors"
              >
                <span className={`text-xs font-mono font-bold px-2 py-1 rounded whitespace-nowrap ${actionColors[log.action] || "text-muted-foreground bg-muted/30"}`}>
                  {log.action}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-mono text-foreground truncate">{log.resource || log.resourceId || "—"}</p>
                  <p className="text-xs text-muted-foreground">{log.tenantId ? `tenant:${log.tenantId.slice(0, 8)}` : "system"} {log.ipAddress ? `· ${log.ipAddress}` : ""}</p>
                </div>
                <span className="text-xs font-mono text-muted-foreground whitespace-nowrap shrink-0">
                  {new Date(log.createdAt).toLocaleString()}
                </span>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </motion.div>
  );
}
