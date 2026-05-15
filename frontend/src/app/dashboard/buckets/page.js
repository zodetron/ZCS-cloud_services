"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FolderOpen, Plus, Trash2, Globe, Lock, Search, Database, RefreshCw, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { GradientButton } from "@/components/ui/gradient-button";
import { EmptyState } from "@/components/ui/empty-state";
import { staggerContainer, staggerItem, defaultTransition } from "@/lib/animations";
import { api } from "@/lib/api";

function formatBytes(bytes) {
  const n = Number(bytes);
  if (!n) return "0 B";
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(2)} MB`;
  return `${(n / 1024 ** 3).toFixed(3)} GB`;
}

function CreateBucketModal({ onClose, onCreated }) {
  const [name, setName] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [region, setRegion] = useState("us-east-1");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate() {
    setLoading(true);
    setError("");
    try {
      const data = await api.post("/api/storage/buckets", { name, isPublic, region });
      onCreated(data.bucket);
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-border/50 bg-card shadow-2xl p-6"
      >
        <h2 className="text-lg font-bold text-foreground mb-2">Create bucket</h2>
        <p className="text-sm text-muted-foreground mb-6">Buckets are containers for objects. Choose a unique name.</p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Bucket name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              onKeyDown={(e) => e.key === "Enter" && name.length >= 3 && handleCreate()}
              placeholder="my-bucket-name"
              className="w-full h-10 px-3 rounded-lg border border-border/50 bg-background/50 text-foreground text-sm font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Region</label>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-border/50 bg-background/50 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              {["us-east-1", "eu-west-1", "ap-southeast-1", "us-west-2"].map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg border border-border/30 bg-muted/20">
            <div>
              <p className="text-sm font-medium text-foreground">Public access</p>
              <p className="text-xs text-muted-foreground">Objects accessible without authentication</p>
            </div>
            <button
              onClick={() => setIsPublic(!isPublic)}
              className={`w-11 h-6 rounded-full transition-colors ${isPublic ? "bg-blue-500" : "bg-muted"}`}
            >
              <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform mx-1 ${isPublic ? "translate-x-5" : "translate-x-0"}`} />
            </button>
          </div>
          {error && (
            <p className="text-sm text-red-400 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" /> {error}
            </p>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 h-10 rounded-lg border border-border/50 text-sm text-muted-foreground hover:bg-muted/50 transition-colors">
            Cancel
          </button>
          <GradientButton onClick={handleCreate} disabled={name.length < 3 || loading} className="flex-1 justify-center">
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Create bucket"}
          </GradientButton>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function BucketsPage() {
  const [buckets, setBuckets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState(null);

  async function loadBuckets() {
    try {
      const data = await api.get("/api/storage/buckets");
      setBuckets(data.buckets || []);
    } catch {
      // keep empty
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadBuckets(); }, []);

  async function handleDelete(bucket) {
    if (bucket._count?.objects > 0) return;
    setDeleting(bucket.id);
    try {
      await api.delete(`/api/storage/buckets/${bucket.name}`);
      setBuckets((prev) => prev.filter((b) => b.id !== bucket.id));
    } catch {
      // ignore
    } finally {
      setDeleting(null);
    }
  }

  const filtered = buckets.filter((b) => b.name.includes(search.toLowerCase()));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHeader
        title="Buckets"
        description="Manage your storage buckets and objects."
        actions={
          <GradientButton onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4" /> New bucket
          </GradientButton>
        }
      />

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search buckets..."
          className="w-full h-10 pl-9 pr-4 rounded-lg border border-border/50 bg-card/50 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 rounded-xl border border-border/30 bg-card animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Database}
          title={search ? "No buckets match your search" : "No buckets yet"}
          description="Create your first bucket to start storing objects."
          action={
            <GradientButton onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4" /> Create bucket
            </GradientButton>
          }
        />
      ) : (
        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((bucket) => (
            <motion.div
              key={bucket.id}
              variants={staggerItem}
              transition={defaultTransition}
              className="group p-5 rounded-xl border border-border/50 bg-card hover:border-border transition-all premium-card"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                    <FolderOpen className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="font-mono font-medium text-foreground text-sm">{bucket.name}</p>
                    <p className="text-xs text-muted-foreground">{bucket.region}</p>
                  </div>
                </div>
                {bucket.isPublic ? (
                  <Globe className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <Lock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Objects</p>
                  <p className="font-medium text-foreground">{(bucket._count?.objects ?? 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Created</p>
                  <p className="font-medium text-foreground">{new Date(bucket.createdAt).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-border/30 flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-mono">{bucket.id.slice(0, 8)}…</span>
                <button
                  onClick={() => handleDelete(bucket)}
                  disabled={deleting === bucket.id || (bucket._count?.objects > 0)}
                  title={bucket._count?.objects > 0 ? "Bucket must be empty to delete" : "Delete bucket"}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded text-muted-foreground hover:text-red-400 hover:bg-red-500/10 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {deleting === bucket.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      <AnimatePresence>
        {showCreate && (
          <CreateBucketModal
            onClose={() => setShowCreate(false)}
            onCreated={(bucket) => setBuckets((prev) => [{ ...bucket, _count: { objects: 0 } }, ...prev])}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
