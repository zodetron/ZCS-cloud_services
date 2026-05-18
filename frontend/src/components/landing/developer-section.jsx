"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Terminal, ArrowRight, Check, Circle } from "lucide-react";
import Link from "next/link";

const tabs = ["Node.js", "Python", "REST API"];

const snippets = {
  "Node.js": [
    { type: "comment", text: "// Install: npm install @zcs/sdk" },
    { type: "blank" },
    { type: "keyword", text: "import", rest: " { ZCS } ", keyword2: "from", string: " '@zcs/sdk'" },
    { type: "blank" },
    { type: "const", name: "client", rest: " = ", call: "new ZCS", args: "({" },
    { type: "prop", key: "apiKey", val: "process.env.STORAGECLOUD_API_KEY" },
    { type: "close", text: "});" },
    { type: "blank" },
    { type: "comment", text: "// Upload a file" },
    { type: "const2", name: "{ url }", rest: " = ", keyword: "await", call: " client.upload", args: "({" },
    { type: "prop", key: "bucket", val: "'my-assets'" },
    { type: "prop", key: "key", val: "'videos/hero.mp4'" },
    { type: "prop", key: "file", val: "fileBuffer" },
    { type: "close", text: "});" },
  ],
  "Python": [
    { type: "comment", text: "# pip install zcs-python" },
    { type: "blank" },
    { type: "raw", tokens: [{ t: "import", c: "#7c83f5" }, { t: " storagecloud", c: "#e2e8f0" }] },
    { type: "blank" },
    { type: "raw", tokens: [{ t: "client", c: "#e2e8f0" }, { t: " = ", c: "#94a3b8" }, { t: "zcs.Client(", c: "#60a5fa" }] },
    { type: "raw", tokens: [{ t: "    api_key", c: "#e2e8f0" }, { t: "=", c: "#94a3b8" }, { t: "os.environ[", c: "#e2e8f0" }, { t: "'STORAGECLOUD_KEY'", c: "#86efac" }, { t: "]", c: "#e2e8f0" }] },
    { type: "raw", tokens: [{ t: ")", c: "#e2e8f0" }] },
    { type: "blank" },
    { type: "raw", tokens: [{ t: "# Upload with boto3 (S3-compatible)", c: "#6b7280" }] },
    { type: "raw", tokens: [{ t: "client", c: "#60a5fa" }, { t: ".upload_file(", c: "#e2e8f0" }] },
    { type: "raw", tokens: [{ t: "    ", c: "#e2e8f0" }, { t: "'local.csv'", c: "#86efac" }, { t: ", ", c: "#94a3b8" }, { t: "'analytics'", c: "#86efac" }, { t: ", ", c: "#94a3b8" }, { t: "'data/2025.csv'", c: "#86efac" }] },
    { type: "raw", tokens: [{ t: ")", c: "#e2e8f0" }] },
  ],
  "REST API": [
    { type: "comment", text: "# Generate presigned upload URL" },
    { type: "blank" },
    { type: "raw", tokens: [{ t: "curl", c: "#60a5fa" }, { t: " -X POST \\", c: "#e2e8f0" }] },
    { type: "raw", tokens: [{ t: '  "https://api.zcs.io/presign/upload" \\', c: "#86efac" }] },
    { type: "raw", tokens: [{ t: "  -H ", c: "#e2e8f0" }, { t: '"X-API-Key: sk_live_xxxx" \\', c: "#86efac" }] },
    { type: "raw", tokens: [{ t: "  -d ", c: "#e2e8f0" }, { t: "'{", c: "#86efac" }] },
    { type: "raw", tokens: [{ t: '    "bucket": "my-assets",', c: "#86efac" }] },
    { type: "raw", tokens: [{ t: '    "key": "report.pdf"', c: "#86efac" }] },
    { type: "raw", tokens: [{ t: "  }'", c: "#86efac" }] },
    { type: "blank" },
    { type: "comment", text: "# Response: { url, expiresAt, storageKey }" },
  ],
};

function renderLine(line, i) {
  if (line.type === "blank") return <div key={i} className="h-4" />;
  if (line.type === "comment") return (
    <div key={i} className="flex gap-4">
      <span className="text-white/20 select-none w-5 text-right shrink-0">{i + 1}</span>
      <span style={{ color: "#6b7280" }}>{line.text}</span>
    </div>
  );
  if (line.type === "raw") return (
    <div key={i} className="flex gap-4">
      <span className="text-white/20 select-none w-5 text-right shrink-0">{i + 1}</span>
      <span>{line.tokens?.map((t, j) => <span key={j} style={{ color: t.c }}>{t.t}</span>)}</span>
    </div>
  );
  if (line.type === "keyword") return (
    <div key={i} className="flex gap-4">
      <span className="text-white/20 select-none w-5 text-right shrink-0">{i + 1}</span>
      <span>
        <span style={{ color: "#7c83f5" }}>{line.text}</span>
        <span style={{ color: "#e2e8f0" }}>{line.rest}</span>
        <span style={{ color: "#7c83f5" }}>{line.keyword2}</span>
        <span style={{ color: "#86efac" }}>{line.string}</span>
      </span>
    </div>
  );
  if (line.type === "const" || line.type === "const2") return (
    <div key={i} className="flex gap-4">
      <span className="text-white/20 select-none w-5 text-right shrink-0">{i + 1}</span>
      <span>
        <span style={{ color: "#7c83f5" }}>const</span>
        <span style={{ color: "#e2e8f0" }}> {line.name}{line.rest}</span>
        {line.keyword && <span style={{ color: "#7c83f5" }}>{line.keyword}</span>}
        <span style={{ color: "#60a5fa" }}>{line.call}</span>
        <span style={{ color: "#e2e8f0" }}>{line.args}</span>
      </span>
    </div>
  );
  if (line.type === "prop") return (
    <div key={i} className="flex gap-4">
      <span className="text-white/20 select-none w-5 text-right shrink-0">{i + 1}</span>
      <span style={{ paddingLeft: 16 }}>
        <span style={{ color: "#f8fafc" }}>{line.key}</span>
        <span style={{ color: "#94a3b8" }}>: </span>
        <span style={{ color: "#86efac" }}>{line.val}</span>
        <span style={{ color: "#94a3b8" }}>,</span>
      </span>
    </div>
  );
  if (line.type === "close") return (
    <div key={i} className="flex gap-4">
      <span className="text-white/20 select-none w-5 text-right shrink-0">{i + 1}</span>
      <span style={{ color: "#e2e8f0" }}>{line.text}</span>
    </div>
  );
  return null;
}

const capabilities = [
  { label: "S3-compatible API", desc: "Drop-in replacement — zero code changes" },
  { label: "Official SDKs", desc: "Node.js, Python, Go — TypeScript included" },
  { label: "OpenAPI spec", desc: "Generate clients in any language" },
  { label: "Webhook events", desc: "Object created, deleted, quota exceeded" },
];

export function DeveloperSection() {
  const [activeTab, setActiveTab] = useState("Node.js");

  return (
    <section id="developers" className="py-32 px-6 bg-black relative overflow-hidden">
      <div className="absolute inset-0 grid-pattern opacity-20 pointer-events-none" />
      <div className="absolute top-1/3 right-0 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(ellipse, rgba(139,92,246,0.06) 0%, transparent 70%)" }} />

      <div className="max-w-7xl mx-auto relative">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* Left */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-violet-500/20 bg-violet-500/[0.07] text-xs font-medium text-violet-300 mb-6 uppercase tracking-widest">
              <Terminal className="w-3 h-3" />
              Developer-first
            </div>

            <h2 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-[1.05] mb-6">
              Works with your
              <br />
              <span className="text-gradient-hero">existing tools.</span>
            </h2>

            <p className="text-lg text-white/60 mb-10 leading-relaxed">
              ZCS is 100% S3-compatible. Use boto3, AWS SDK, rclone, or any S3 tool — no changes needed. Or use our SDKs for a first-class experience.
            </p>

            <div className="space-y-4 mb-10">
              {capabilities.map(({ label, desc }) => (
                <div key={label} className="flex items-start gap-4">
                  <div className="w-6 h-6 rounded-full bg-violet-500/10 ring-1 ring-violet-500/20 flex items-center justify-center mt-0.5 shrink-0">
                    <Check className="w-3 h-3 text-violet-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{label}</p>
                    <p className="text-xs text-white/30 mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <Link
              href="/docs"
              className="group inline-flex items-center gap-2 px-6 py-3 rounded-full border border-white/10 text-white/60 text-sm font-medium hover:border-white/20 hover:text-white hover:bg-white/[0.04] transition-all duration-300"
            >
              <Terminal className="w-4 h-4" />
              Read the docs
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </motion.div>

          {/* Right: code block */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="rounded-2xl border border-white/[0.1] overflow-hidden" style={{ background: "#0b0d18", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.07), 0 8px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03)" }}>
              {/* Terminal header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.07]" style={{ background: "rgba(255,255,255,0.03)" }}>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/60" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                  <div className="w-3 h-3 rounded-full bg-green-500/60" />
                </div>
                <div className="flex items-center gap-1 rounded-lg overflow-hidden">
                  {tabs.map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-3 py-1 text-xs font-medium rounded transition-all duration-200 ${
                        activeTab === tab
                          ? "bg-white/10 text-white"
                          : "text-white/30 hover:text-white/60"
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
                <div className="w-16" />
              </div>

              {/* Code */}
              <div className="code-terminal p-5 font-mono text-[13px] leading-6 min-h-[320px]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                  >
                    {snippets[activeTab].map((line, i) => renderLine(line, i))}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Footer bar */}
              <div className="flex items-center gap-4 px-5 py-2.5 bg-white/[0.02] border-t border-white/[0.04]">
                <Circle className="w-2 h-2 fill-emerald-400 text-emerald-400" />
                <span className="text-xs text-white/20 font-mono">zcs.io — API ready</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
