"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Key, Plus, Copy, Trash2, AlertTriangle, CheckCircle, RefreshCw, ShieldOff } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { GradientButton } from "@/components/ui/gradient-button";
import { BadgeStatus } from "@/components/ui/badge-status";
import { EmptyState } from "@/components/ui/empty-state";
import { api } from "@/lib/api";

function timeAgo(date) {
  if (!date) return "never";
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(date).toLocaleDateString();
}

function NewKeyModal({ onClose, onCreated }) {
  const [name, setName] = useState("");
  const [permissions, setPermissions] = useState(["read", "write"]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState(null);
  const [copied, setCopied] = useState(false);

  const perms = ["read", "write", "delete"];

  const toggle = (p) =>
    setPermissions((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    setError("");
    try {
      const data = await api.post("/api/keys", { name: name.trim(), permissions });
      setCreated(data.key.key);
      onCreated(data.key);
    } catch (e) {
      setError(e.message || "Failed to create key");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(created);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
      onClick={!created ? onClose : undefined}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-border/50 bg-card shadow-2xl p-6"
      >
        {!created ? (
          <>
            <h2 className="text-lg font-bold text-foreground mb-2">Create API key</h2>
            <p className="text-sm text-muted-foreground mb-6">
              API keys provide programmatic access to your storage.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Key name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  placeholder="Production API, CI/CD, etc."
                  className="w-full h-10 px-3 rounded-lg border border-border/50 bg-background/50 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-3">Permissions</label>
                <div className="grid grid-cols-3 gap-2">
                  {perms.map((p) => (
                    <button
                      key={p}
                      onClick={() => toggle(p)}
                      className={`flex items-center gap-2 p-2.5 rounded-lg border text-sm transition-all ${
                        permissions.includes(p)
                          ? "border-blue-500/50 bg-blue-500/10 text-blue-400"
                          : "border-border/30 text-muted-foreground hover:border-border"
                      }`}
                    >
                      <div
                        className={`w-3.5 h-3.5 rounded border-2 transition-colors ${
                          permissions.includes(p)
                            ? "border-blue-400 bg-blue-400"
                            : "border-muted-foreground"
                        }`}
                      />
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" /> {error}
                </p>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={onClose}
                className="flex-1 h-10 rounded-lg border border-border/50 text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
              >
                Cancel
              </button>
              <GradientButton
                onClick={handleCreate}
                disabled={!name.trim() || permissions.length === 0 || loading}
                className="flex-1 justify-center"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  "Generate key"
                )}
              </GradientButton>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">API key created</h2>
                <p className="text-xs text-muted-foreground">
                  Copy it now — it won&apos;t be shown again
                </p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 mb-2 overflow-x-auto">
              <code className="text-xs text-emerald-400 font-mono break-all select-all">
                {created}
              </code>
            </div>

            <button
              onClick={handleCopy}
              className={`w-full h-10 rounded-lg border text-sm font-medium flex items-center justify-center gap-2 transition-all mb-6 ${
                copied
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                  : "border-border/50 text-muted-foreground hover:bg-muted/50"
              }`}
            >
              {copied ? (
                <>
                  <CheckCircle className="w-4 h-4" /> Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" /> Copy to clipboard
                </>
              )}
            </button>

            <div className="p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20 flex items-start gap-2 mb-6">
              <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
              <p className="text-xs text-yellow-400/80">
                This key will not be displayed again. Store it securely in your
                environment variables or a secrets manager.
              </p>
            </div>

            <button
              onClick={onClose}
              className="w-full h-10 rounded-lg border border-border/50 text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
            >
              Done
            </button>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [revoking, setRevoking] = useState(null);
  const [deleting, setDeleting] = useState(null);

  async function loadKeys() {
    try {
      const data = await api.get("/api/keys");
      setKeys(data.keys || []);
    } catch {
      // keep empty
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadKeys();
  }, []);

  function handleCreated(newKey) {
    setKeys((prev) => [newKey, ...prev]);
  }

  async function handleRevoke(id) {
    setRevoking(id);
    try {
      await api.patch(`/api/keys/${id}/revoke`);
      setKeys((prev) =>
        prev.map((k) => (k.id === id ? { ...k, status: "revoked" } : k))
      );
    } catch {
      // ignore
    } finally {
      setRevoking(null);
    }
  }

  async function handleDelete(id) {
    setDeleting(id);
    try {
      await api.delete(`/api/keys/${id}`);
      setKeys((prev) => prev.filter((k) => k.id !== id));
    } catch {
      // ignore
    } finally {
      setDeleting(null);
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHeader
        title="API Keys"
        description="Manage programmatic access to your storage."
        actions={
          <GradientButton onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4" /> New API key
          </GradientButton>
        }
      />

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-xl border border-border/30 bg-card animate-pulse" />
          ))}
        </div>
      ) : keys.length === 0 ? (
        <EmptyState
          icon={Key}
          title="No API keys"
          description="Create an API key to access your storage programmatically."
          action={
            <GradientButton onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4" /> Create API key
            </GradientButton>
          }
        />
      ) : (
        <div className="space-y-3">
          {keys.map((key, i) => (
            <motion.div
              key={key.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className={`p-5 rounded-xl border bg-card flex items-start justify-between gap-4 ${
                key.status === "revoked"
                  ? "border-border/20 opacity-60"
                  : "border-border/50"
              }`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                    key.status === "active"
                      ? "bg-blue-500/10 border border-blue-500/20"
                      : "bg-muted/50 border border-border/30"
                  }`}
                >
                  <Key
                    className={`w-4 h-4 ${
                      key.status === "active"
                        ? "text-blue-400"
                        : "text-muted-foreground"
                    }`}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-foreground text-sm">{key.name}</p>
                    <BadgeStatus status={key.status} />
                  </div>
                  <p className="text-xs font-mono text-muted-foreground mb-2">
                    {key.keyPrefix}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {(key.permissions || []).map((p) => (
                      <span
                        key={p}
                        className="px-1.5 py-0.5 rounded text-xs bg-muted/50 text-muted-foreground font-mono"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0 space-y-1.5">
                <p className="text-xs text-muted-foreground">
                  Last used: {timeAgo(key.lastUsedAt)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Created: {new Date(key.createdAt).toLocaleDateString()}
                </p>
                <div className="flex items-center justify-end gap-2 pt-1">
                  {key.status === "active" && (
                    <button
                      onClick={() => handleRevoke(key.id)}
                      disabled={revoking === key.id}
                      className="flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300 transition-colors disabled:opacity-50"
                    >
                      {revoking === key.id ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : (
                        <ShieldOff className="w-3 h-3" />
                      )}
                      Revoke
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(key.id)}
                    disabled={deleting === key.id}
                    className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
                  >
                    {deleting === key.id ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <Trash2 className="w-3 h-3" />
                    )}
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showCreate && (
          <NewKeyModal
            onClose={() => setShowCreate(false)}
            onCreated={(key) => {
              handleCreated(key);
              // modal stays open to show the key — user clicks Done to close
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
