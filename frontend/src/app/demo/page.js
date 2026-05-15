"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Key,
  Play,
  RefreshCw,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Database,
  Upload,
  Download,
  Trash2,
  List,
  FolderPlus,
  DollarSign,
  Activity,
  Zap,
  Clock,
  HardDrive,
  FileUp,
  File,
  X,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

function formatBytes(bytes) {
  const n = Number(bytes);
  if (n === 0) return "0 B";
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(2)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(2)} MB`;
  return `${(n / 1024 ** 3).toFixed(4)} GB`;
}

function formatCost(usd) {
  if (usd < 0.000001) return "$0.000000";
  return `$${usd.toFixed(6)}`;
}

function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

const EVENT_COLORS = {
  upload: "text-blue-400",
  download: "text-emerald-400",
  delete: "text-red-400",
  list_buckets: "text-purple-400",
  list_objects: "text-purple-400",
  create_bucket: "text-orange-400",
  delete_bucket: "text-red-400",
  presign_upload: "text-cyan-400",
  presign_download: "text-cyan-400",
};

const SAMPLE_CONTENT = {
  json: JSON.stringify({ hello: "world", timestamp: new Date().toISOString(), source: "StorageCloud Demo" }, null, 2),
  text: "Hello from StorageCloud! This is a plain-text file uploaded via the API Explorer.",
};

// ── Drag-and-drop file upload zone ─────────────────────────────────────────
function FileDropZone({ bucketName, apiKey, onUploadDone }) {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  function handleDragOver(e) {
    e.preventDefault();
    setDragging(true);
  }
  function handleDragLeave() {
    setDragging(false);
  }
  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) pick(dropped);
  }
  function pick(f) {
    setFile(f);
    setResult(null);
    setError("");
    setProgress(0);
  }

  async function upload() {
    if (!file || !bucketName) return;
    setUploading(true);
    setError("");
    setResult(null);
    setProgress(10);

    try {
      const form = new FormData();
      form.append("file", file);

      // Use XHR for progress tracking
      const xhr = new XMLHttpRequest();
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 90));
      };

      const res = await new Promise((resolve, reject) => {
        xhr.onload = () => resolve(xhr);
        xhr.onerror = () => reject(new Error("Network error"));
        const ext = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")) : "";
        const base = file.name.includes(".") ? file.name.slice(0, file.name.lastIndexOf(".")) : file.name;
        const uniqueKey = `${base}-${Date.now()}${ext}`;
        xhr.open("POST", `${API_URL}/api/storage/buckets/${bucketName}/upload-file?key=${encodeURIComponent(uniqueKey)}`);
        xhr.setRequestHeader("X-API-Key", apiKey);
        xhr.send(form);
      });

      setProgress(100);
      const data = JSON.parse(res.responseText);
      if (res.status >= 400) throw new Error(data.error || `HTTP ${res.status}`);
      setResult(data);
      onUploadDone(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  }

  function reset() {
    setFile(null);
    setResult(null);
    setError("");
    setProgress(0);
  }

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !file && inputRef.current?.click()}
        className={`relative rounded-xl border-2 border-dashed transition-all cursor-pointer ${
          dragging
            ? "border-blue-400 bg-blue-500/10"
            : file
            ? "border-emerald-500/40 bg-emerald-500/5 cursor-default"
            : "border-border/40 hover:border-border/70 hover:bg-muted/20"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && pick(e.target.files[0])}
        />

        <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
          {file ? (
            <>
              <File className="w-8 h-8 text-emerald-400 mb-2" />
              <p className="text-sm font-medium text-foreground truncate max-w-full">{file.name}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {formatBytes(file.size)} · {file.type || "unknown type"}
              </p>
            </>
          ) : (
            <>
              <FileUp className={`w-8 h-8 mb-2 transition-colors ${dragging ? "text-blue-400" : "text-muted-foreground/50"}`} />
              <p className="text-sm text-muted-foreground">
                {dragging ? "Drop to upload" : "Drag & drop a file, or click to browse"}
              </p>
              <p className="text-xs text-muted-foreground/50 mt-1">Any file type · up to 100 MB</p>
            </>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {uploading && (
        <div className="space-y-1">
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <motion.div
              animate={{ width: `${progress}%` }}
              transition={{ ease: "easeOut" }}
              className="h-full bg-blue-500 rounded-full"
            />
          </div>
          <p className="text-xs text-muted-foreground text-right">{progress}%</p>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span>Uploaded <span className="font-mono">{result.object?.key}</span> · {formatBytes(result.bytes)}</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          <XCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Buttons */}
      {file && (
        <div className="flex gap-2">
          <button
            onClick={upload}
            disabled={uploading}
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
          >
            {uploading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            {uploading ? "Uploading…" : "Upload"}
          </button>
          <button
            onClick={reset}
            disabled={uploading}
            className="p-2 rounded-lg border border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export default function DemoPage() {
  const [apiKey, setApiKey] = useState("");
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState("");

  const [bucketName, setBucketName] = useState("demo-bucket");
  const [objectKey, setObjectKey] = useState("test/hello.json");
  const [uploadContent, setUploadContent] = useState(SAMPLE_CONTENT.json);
  const [contentType, setContentType] = useState("application/json");
  const [uploadTab, setUploadTab] = useState("text"); // "text" | "file"

  const [running, setRunning] = useState(null);
  const [log, setLog] = useState([]);
  const logEndRef = useRef(null);

  const [usage, setUsage] = useState(null);
  const [usageLoading, setUsageLoading] = useState(false);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [log]);

  async function apiReq(method, path, body) {
    const headers = { "Content-Type": "application/json", "X-API-Key": apiKey };
    const opts = { method, headers };
    if (body !== undefined) opts.body = JSON.stringify(body);
    const res = await fetch(`${API_URL}/api/storage${path}`, opts);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  }

  const fetchUsage = useCallback(async () => {
    if (!apiKey) return;
    setUsageLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/demo/usage`, {
        headers: { "X-API-Key": apiKey },
      });
      const data = await res.json();
      if (res.ok) setUsage(data);
    } catch {
      // non-fatal
    } finally {
      setUsageLoading(false);
    }
  }, [apiKey]);

  useEffect(() => {
    if (!connected) return;
    fetchUsage();
    const id = setInterval(fetchUsage, 5000);
    return () => clearInterval(id);
  }, [connected, fetchUsage]);

  async function connect() {
    if (!apiKey.trim()) return;
    setConnecting(true);
    setConnectError("");
    try {
      await apiReq("GET", "/buckets");
      setConnected(true);
      addLog("connect", "Connected successfully", null, true);
    } catch (e) {
      setConnectError(e.message);
    } finally {
      setConnecting(false);
    }
  }

  function addLog(action, label, result, ok) {
    setLog((prev) => [
      ...prev,
      { id: crypto.randomUUID(), ts: new Date(), action, label, result, ok },
    ]);
  }

  async function run(actionKey, label, fn) {
    setRunning(actionKey);
    try {
      const result = await fn();
      addLog(actionKey, label, result, true);
      await fetchUsage();
    } catch (e) {
      addLog(actionKey, label, { error: e.message }, false);
    } finally {
      setRunning(null);
    }
  }

  const actions = [
    {
      key: "list_buckets",
      label: "List Buckets",
      icon: List,
      color: "text-purple-400 border-purple-500/30 hover:border-purple-400/60 hover:bg-purple-500/10",
      description: "GET /buckets",
      fn: () => apiReq("GET", "/buckets"),
    },
    {
      key: "create_bucket",
      label: "Create Bucket",
      icon: FolderPlus,
      color: "text-orange-400 border-orange-500/30 hover:border-orange-400/60 hover:bg-orange-500/10",
      description: "POST /buckets",
      fn: () => apiReq("POST", "/buckets", { name: bucketName, isPublic: false }),
    },
    {
      key: "upload",
      label: "Upload (Text/JSON)",
      icon: Upload,
      color: "text-blue-400 border-blue-500/30 hover:border-blue-400/60 hover:bg-blue-500/10",
      description: `POST /buckets/${bucketName}/upload`,
      fn: () =>
        apiReq("POST", `/buckets/${bucketName}/upload`, {
          key: objectKey,
          content: uploadContent,
          contentType,
        }),
    },
    {
      key: "list_objects",
      label: "List Objects",
      icon: Database,
      color: "text-purple-400 border-purple-500/30 hover:border-purple-400/60 hover:bg-purple-500/10",
      description: `GET /buckets/${bucketName}/objects`,
      fn: () => apiReq("GET", `/buckets/${bucketName}/objects`),
    },
    {
      key: "download",
      label: "Download Object",
      icon: Download,
      color: "text-emerald-400 border-emerald-500/30 hover:border-emerald-400/60 hover:bg-emerald-500/10",
      description: `GET /buckets/${bucketName}/objects/${objectKey}`,
      fn: async () => {
        const res = await fetch(
          `${API_URL}/api/storage/buckets/${bucketName}/objects/${objectKey}`,
          { headers: { "X-API-Key": apiKey } }
        );
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.error || `HTTP ${res.status}`);
        }
        const type = res.headers.get("content-type") || "application/octet-stream";
        const blob = await res.blob();

        // Trigger browser download
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = objectKey.split("/").pop();
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 5000);

        // Return summary for the log — avoid dumping binary in the terminal
        const isText = type.startsWith("text/") || type.includes("json");
        const preview = isText ? await blob.text() : `[binary ${type}]`;
        return {
          filename: objectKey.split("/").pop(),
          contentType: type,
          bytes: blob.size,
          preview: preview.length > 500 ? preview.slice(0, 500) + "…" : preview,
        };
      },
    },
    {
      key: "delete_object",
      label: "Delete Object",
      icon: Trash2,
      color: "text-red-400 border-red-500/30 hover:border-red-400/60 hover:bg-red-500/10",
      description: `DELETE /buckets/${bucketName}/objects/${objectKey}`,
      fn: () => apiReq("DELETE", `/buckets/${bucketName}/objects/${objectKey}`),
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-foreground">API Explorer</h1>
              <p className="text-xs text-muted-foreground">Live storage sandbox</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {connected && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Connected
              </span>
            )}
            <a href="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              ← Back to home
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column */}
        <div className="lg:col-span-1 space-y-6">
          {/* API Key */}
          <div className="rounded-xl border border-border/50 bg-card p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">API Key</h2>
            </div>
            <div className="space-y-3">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => { setApiKey(e.target.value); setConnected(false); setConnectError(""); }}
                placeholder="sk_live_••••••••••••••••"
                className="w-full bg-background border border-border/50 rounded-lg px-3 py-2 text-sm font-mono placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50"
              />
              {connectError && (
                <p className="text-xs text-red-400 flex items-center gap-1">
                  <XCircle className="w-3 h-3" /> {connectError}
                </p>
              )}
              <button
                onClick={connect}
                disabled={!apiKey.trim() || connecting}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
              >
                {connecting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                {connecting ? "Connecting…" : connected ? "Reconnect" : "Connect"}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Generate a key in{" "}
              <a href="/dashboard/api-keys" className="text-blue-400 hover:underline">
                Dashboard → API Keys
              </a>
            </p>
          </div>

          {/* Request Params + Upload */}
          {connected && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-border/50 bg-card p-6 space-y-4"
            >
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Activity className="w-4 h-4 text-muted-foreground" />
                Request Params
              </h2>

              <div className="space-y-3 text-sm">
                <label className="block">
                  <span className="text-xs text-muted-foreground mb-1 block">Bucket name</span>
                  <input
                    value={bucketName}
                    onChange={(e) => setBucketName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                    className="w-full bg-background border border-border/50 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50"
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-muted-foreground mb-1 block">Object key (for text upload / download / delete)</span>
                  <input
                    value={objectKey}
                    onChange={(e) => setObjectKey(e.target.value)}
                    className="w-full bg-background border border-border/50 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50"
                  />
                </label>
              </div>

              {/* Upload tabs */}
              <div className="pt-2">
                <div className="flex rounded-lg border border-border/50 overflow-hidden mb-4">
                  <button
                    onClick={() => setUploadTab("text")}
                    className={`flex-1 py-2 text-xs font-medium transition-colors ${
                      uploadTab === "text"
                        ? "bg-blue-600 text-white"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                    }`}
                  >
                    Text / JSON
                  </button>
                  <button
                    onClick={() => setUploadTab("file")}
                    className={`flex-1 py-2 text-xs font-medium transition-colors ${
                      uploadTab === "file"
                        ? "bg-blue-600 text-white"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                    }`}
                  >
                    Drag & Drop File
                  </button>
                </div>

                <AnimatePresence mode="wait">
                  {uploadTab === "text" ? (
                    <motion.div
                      key="text"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.15 }}
                      className="space-y-3"
                    >
                      <label className="block">
                        <span className="text-xs text-muted-foreground mb-1 block">Content-Type</span>
                        <select
                          value={contentType}
                          onChange={(e) => {
                            setContentType(e.target.value);
                            if (e.target.value === "application/json") setUploadContent(SAMPLE_CONTENT.json);
                            else setUploadContent(SAMPLE_CONTENT.text);
                          }}
                          className="w-full bg-background border border-border/50 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                        >
                          <option value="application/json">application/json</option>
                          <option value="text/plain">text/plain</option>
                          <option value="text/csv">text/csv</option>
                        </select>
                      </label>
                      <label className="block">
                        <span className="text-xs text-muted-foreground mb-1 block">Upload body</span>
                        <textarea
                          value={uploadContent}
                          onChange={(e) => setUploadContent(e.target.value)}
                          rows={5}
                          className="w-full bg-background border border-border/50 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500/50 resize-none"
                        />
                      </label>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="file"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.15 }}
                    >
                      <FileDropZone
                        bucketName={bucketName}
                        apiKey={apiKey}
                        onUploadDone={(data) => {
                          addLog("upload_file", `Upload File: ${data.object?.key}`, data, true);
                          fetchUsage();
                        }}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {/* Action buttons */}
          {connected && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-xl border border-border/50 bg-card p-6 space-y-3"
            >
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Zap className="w-4 h-4 text-muted-foreground" />
                Actions
              </h2>
              {actions.map((action) => {
                const Icon = action.icon;
                const isRunning = running === action.key;
                return (
                  <button
                    key={action.key}
                    onClick={() => run(action.key, action.label, action.fn)}
                    disabled={running !== null}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border text-left transition-all disabled:opacity-50 disabled:cursor-not-allowed ${action.color}`}
                  >
                    {isRunning ? (
                      <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                    ) : (
                      <Icon className="w-4 h-4 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{action.label}</p>
                      <p className="text-xs text-muted-foreground font-mono truncate">{action.description}</p>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  </button>
                );
              })}
            </motion.div>
          )}
        </div>

        {/* Right column — response log + usage */}
        <div className="lg:col-span-2 space-y-6">
          {/* Usage meters */}
          {connected && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-2 sm:grid-cols-4 gap-4"
            >
              {[
                {
                  label: "Storage",
                  value: usage ? formatBytes(usage.storageBytes) : "—",
                  sub: usage ? formatCost(usage.costs?.storage) : "",
                  icon: HardDrive,
                  color: "text-blue-400",
                },
                {
                  label: "Uploaded",
                  value: usage ? formatBytes(usage.uploadBytes) : "—",
                  sub: `${usage?.objectCount ?? "—"} objects`,
                  icon: Upload,
                  color: "text-purple-400",
                },
                {
                  label: "Downloaded",
                  value: usage ? formatBytes(usage.downloadBytes) : "—",
                  sub: usage ? formatCost(usage.costs?.egress) : "",
                  icon: Download,
                  color: "text-emerald-400",
                },
                {
                  label: "Total Cost",
                  value: usage ? formatCost(usage.costs?.total) : "—",
                  sub: `${usage?.requestCount ?? "—"} requests`,
                  icon: DollarSign,
                  color: "text-orange-400",
                },
              ].map(({ label, value, sub, icon: Icon, color }) => (
                <div key={label} className="rounded-xl border border-border/50 bg-card px-4 py-4 flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-3.5 h-3.5 ${color}`} />
                    <span className="text-xs text-muted-foreground">{label}</span>
                    {usageLoading && (
                      <RefreshCw className="w-2.5 h-2.5 text-muted-foreground/40 animate-spin ml-auto" />
                    )}
                  </div>
                  <p className="text-lg font-semibold font-mono">{value}</p>
                  <p className="text-xs text-muted-foreground font-mono">{sub}</p>
                </div>
              ))}
            </motion.div>
          )}

          {/* Response terminal */}
          <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
            <div className="px-6 py-3 border-b border-border/30 flex items-center justify-between bg-muted/20">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500/70" />
                <span className="w-3 h-3 rounded-full bg-yellow-500/70" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/70" />
                <span className="text-xs text-muted-foreground ml-2 font-mono">response log</span>
              </div>
              {log.length > 0 && (
                <button
                  onClick={() => setLog([])}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="h-[480px] overflow-y-auto p-4 font-mono text-xs space-y-4 bg-black/20">
              {log.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground/40 gap-3">
                  <Zap className="w-8 h-8" />
                  <p>
                    {connected
                      ? "Click an action to execute a real API request"
                      : "Paste your API key and click Connect to start"}
                  </p>
                </div>
              )}
              <AnimatePresence>
                {log.map((entry) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-1.5"
                  >
                    <div className="flex items-center gap-2">
                      {entry.ok ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      )}
                      <span className={`font-semibold ${entry.ok ? "text-emerald-400" : "text-red-400"}`}>
                        {entry.label}
                      </span>
                      <span className="text-muted-foreground/50 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {timeAgo(entry.ts)}
                      </span>
                    </div>
                    {entry.result !== null && (
                      <pre className="bg-black/30 border border-border/20 rounded-lg p-3 text-[11px] overflow-x-auto text-muted-foreground leading-relaxed max-h-64">
                        {JSON.stringify(entry.result, null, 2)}
                      </pre>
                    )}
                    <div className="border-b border-border/10" />
                  </motion.div>
                ))}
              </AnimatePresence>
              <div ref={logEndRef} />
            </div>
          </div>

          {/* Recent events feed */}
          {connected && usage?.recentEvents?.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-border/50 bg-card overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-border/30 flex items-center justify-between">
                <h3 className="text-sm font-semibold">Recent Usage Events</h3>
                <span className="text-xs text-muted-foreground">from your account this month</span>
              </div>
              <div className="divide-y divide-border/20">
                {usage.recentEvents.slice(0, 10).map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center gap-4 px-6 py-3 hover:bg-muted/10 transition-colors"
                  >
                    <span
                      className={`text-xs font-bold font-mono w-24 shrink-0 ${
                        EVENT_COLORS[e.eventType] || "text-muted-foreground"
                      }`}
                    >
                      {e.eventType}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono flex-1">
                      {Number(e.bytes) > 0 ? formatBytes(e.bytes) : "—"}
                    </span>
                    <span className="text-xs text-muted-foreground/60">{timeAgo(e.createdAt)}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
