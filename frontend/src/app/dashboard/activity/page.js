"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, Upload, Download, Trash2, FolderPlus, Key, RefreshCw, List } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { api } from "@/lib/api";

const TYPE_CFG = {
  upload:           { icon: Upload,     color: "text-blue-400 bg-blue-500/10",     label: "UPLOAD" },
  download:         { icon: Download,   color: "text-emerald-400 bg-emerald-500/10", label: "DOWNLOAD" },
  delete:           { icon: Trash2,     color: "text-red-400 bg-red-500/10",       label: "DELETE" },
  delete_object:    { icon: Trash2,     color: "text-red-400 bg-red-500/10",       label: "DELETE" },
  create_bucket:    { icon: FolderPlus, color: "text-purple-400 bg-purple-500/10", label: "CREATE BUCKET" },
  delete_bucket:    { icon: Trash2,     color: "text-red-400 bg-red-500/10",       label: "DELETE BUCKET" },
  list_buckets:     { icon: List,       color: "text-muted-foreground bg-muted/30", label: "LIST BUCKETS" },
  list_objects:     { icon: List,       color: "text-muted-foreground bg-muted/30", label: "LIST OBJECTS" },
  presign_upload:   { icon: Key,        color: "text-cyan-400 bg-cyan-500/10",     label: "PRESIGN" },
  presign_download: { icon: Key,        color: "text-cyan-400 bg-cyan-500/10",     label: "PRESIGN" },
};

function formatBytes(bytes) {
  const n = Number(bytes);
  if (!n) return null;
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
  return new Date(date).toLocaleDateString();
}

export default function ActivityPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(true);
  const latestIdRef = useRef(null);

  async function loadEvents(silent = false) {
    if (!silent) setLoading(true);
    try {
      const data = await api.get("/api/usage/events?limit=50");
      setEvents(data.events || []);
      if (data.events?.length) latestIdRef.current = data.events[0].id;
    } catch {
      // keep existing
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadEvents(); }, []);

  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => loadEvents(true), 4000);
    return () => clearInterval(id);
  }, [live]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHeader
        title="Activity Feed"
        description="Real-time stream of all storage operations."
        actions={
          <button
            onClick={() => setLive(!live)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
              live
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                : "border-border/50 text-muted-foreground hover:bg-muted/50"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${live ? "bg-emerald-400 animate-pulse" : "bg-muted-foreground"}`} />
            {live ? "Live" : "Paused"}
          </button>
        }
      />

      <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
        <div className="p-4 border-b border-border/30 flex items-center gap-2">
          <Activity className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground font-mono">{events.length} events</span>
          {loading && <RefreshCw className="w-3.5 h-3.5 text-muted-foreground animate-spin ml-auto" />}
        </div>

        <div className="divide-y divide-border/20 max-h-[600px] overflow-y-auto">
          {loading && events.length === 0 ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3.5 animate-pulse">
                <div className="w-8 h-8 rounded-lg bg-muted shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-muted rounded w-1/2" />
                  <div className="h-2.5 bg-muted rounded w-1/3" />
                </div>
              </div>
            ))
          ) : events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground/40 gap-2">
              <Activity className="w-8 h-8" />
              <p className="text-sm">No events yet — try the <a href="/demo" className="text-blue-400 hover:underline">API Explorer</a></p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {events.map((event) => {
                const cfg = TYPE_CFG[event.eventType] || { icon: Activity, color: "text-muted-foreground bg-muted/30", label: event.eventType?.toUpperCase() };
                const Icon = cfg.icon;
                const size = formatBytes(event.bytes);
                return (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -20, backgroundColor: "rgba(96,165,250,0.05)" }}
                    animate={{ opacity: 1, x: 0, backgroundColor: "rgba(0,0,0,0)" }}
                    transition={{ duration: 0.3 }}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/10 transition-colors"
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${cfg.color}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded ${cfg.color}`}>{cfg.label}</span>
                        {event.objectKey && <span className="text-sm text-foreground font-mono truncate">{event.objectKey}</span>}
                      </div>
                      {event.bucketName && (
                        <p className="text-xs text-muted-foreground mt-0.5">bucket: {event.bucketName}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      {size && <p className="text-sm font-mono text-muted-foreground">{size}</p>}
                      <p className="text-xs text-muted-foreground/60">{timeAgo(event.createdAt)}</p>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </div>
    </motion.div>
  );
}
