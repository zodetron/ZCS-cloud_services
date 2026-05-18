"use client";

import { motion } from "framer-motion";
import { Database, Zap, Globe, Shield, Server, Activity } from "lucide-react";
import { useEffect, useState } from "react";

function Pulse({ delay = 0, size = "sm" }) {
  const sizes = { sm: "w-1.5 h-1.5", md: "w-2 h-2", lg: "w-3 h-3" };
  return (
    <div
      className={`${sizes[size]} rounded-full bg-blue-400 animate-pulse-dot`}
      style={{ animationDelay: `${delay}s` }}
    />
  );
}

function DataPacket({ startX, startY, endX, endY, delay = 0, color = "#60a5fa" }) {
  return (
    <motion.circle
      r={3}
      fill={color}
      initial={{ cx: startX, cy: startY, opacity: 0 }}
      animate={{
        cx: [startX, endX],
        cy: [startY, endY],
        opacity: [0, 1, 1, 0],
      }}
      transition={{
        duration: 2,
        delay,
        repeat: Infinity,
        repeatDelay: 1,
        ease: "easeInOut",
      }}
    />
  );
}

const nodes = [
  { id: "client",  label: "Client",        icon: Globe,     x: 10, y: 50, color: "#60a5fa" },
  { id: "edge",    label: "Edge CDN",      icon: Zap,       x: 30, y: 15, color: "#a78bfa" },
  { id: "api",     label: "API Gateway",   icon: Activity,  x: 52, y: 50, color: "#34d399" },
  { id: "auth",    label: "Auth",          icon: Shield,    x: 75, y: 15, color: "#f59e0b" },
  { id: "storage", label: "MinIO Cluster", icon: Database,  x: 86, y: 62, color: "#60a5fa" },
  { id: "queue",   label: "Queue",         icon: Server,    x: 58, y: 83, color: "#ec4899" },
];

const connections = [
  { from: 0, to: 2 },
  { from: 1, to: 2 },
  { from: 2, to: 3 },
  { from: 2, to: 4 },
  { from: 2, to: 5 },
];

const activityLog = [
  { time: "now", msg: "PUT bucket/video-assets/intro.mp4 — 142MB" },
  { time: "1s ago", msg: "GET presigned URL — expires 3600s" },
  { time: "2s ago", msg: "DELETE bucket/temp/draft-v1.json" },
  { time: "3s ago", msg: "LIST objects — 2,841 items" },
  { time: "5s ago", msg: "POST usage event — 142MB upload" },
];

export function InfrastructureVisual() {
  const [logIndex, setLogIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setLogIndex((i) => (i + 1) % activityLog.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative max-w-5xl mx-auto rounded-2xl overflow-hidden" style={{ background: "#0b0d18", borderTop: "1px solid rgba(96,165,250,0.55)", borderLeft: "1px solid rgba(255,255,255,0.08)", borderRight: "1px solid rgba(255,255,255,0.08)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
      {/* Window chrome */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.07]" style={{ background: "rgba(255,255,255,0.03)" }}>
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500/70" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
          <div className="w-3 h-3 rounded-full bg-green-500/70" />
        </div>
        <div className="flex-1 flex justify-center">
          <div className="px-4 py-0.5 rounded bg-white/[0.05] text-xs text-white/50 font-mono">
            zcs.io — Infrastructure Overview
          </div>
        </div>
        <Pulse size="sm" />
      </div>

      <div className="grid grid-cols-3 divide-x divide-white/10" style={{ minHeight: 340 }}>
        {/* Network graph */}
        <div className="col-span-2 p-6 relative">
          <p className="text-xs text-white/50 font-mono mb-4 flex items-center gap-2">
            <span className="text-blue-400">●</span> Request Flow — Live
          </p>

          <svg viewBox="0 0 100 100" className="w-full" style={{ height: 240 }}>
            {/* Connection lines */}
            {connections.map(({ from, to }, i) => (
              <motion.line
                key={i}
                x1={nodes[from].x}
                y1={nodes[from].y}
                x2={nodes[to].x}
                y2={nodes[to].y}
                stroke="rgba(96,165,250,0.2)"
                strokeWidth="0.5"
                strokeDasharray="2 2"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ delay: i * 0.15, duration: 0.6 }}
              />
            ))}

            {/* Animated packets */}
            {connections.map(({ from, to }, i) => (
              <DataPacket
                key={i}
                startX={nodes[from].x}
                startY={nodes[from].y}
                endX={nodes[to].x}
                endY={nodes[to].y}
                delay={i * 0.6}
                color={nodes[to].color}
              />
            ))}

            {/* Nodes */}
            {nodes.map((node, i) => (
              <g key={node.id}>
                <motion.circle
                  cx={node.x}
                  cy={node.y}
                  r={5}
                  fill={`${node.color}15`}
                  stroke={node.color}
                  strokeWidth="0.5"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: i * 0.1, duration: 0.4 }}
                />
                <motion.text
                  x={node.x}
                  y={node.y + 8}
                  textAnchor="middle"
                  fill={node.color}
                  fontSize="3.5"
                  fontFamily="monospace"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.1 + 0.3 }}
                >
                  {node.label}
                </motion.text>
              </g>
            ))}
          </svg>
        </div>

        {/* Activity feed */}
        <div className="p-6">
          <p className="text-xs text-white/50 font-mono mb-4 flex items-center gap-2">
            <span className="text-emerald-400">●</span> Activity
          </p>
          <div className="space-y-3 font-mono">
            {activityLog.map((log, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: i === 0 ? 1 : 0.4, x: 0 }}
                transition={{ duration: 0.3 }}
                className="text-xs"
              >
                <span className="text-white/50/60 block mb-0.5">{log.time}</span>
                <span className={i === 0 ? "text-emerald-400" : "text-white/50/60"}>
                  {log.msg}
                </span>
              </motion.div>
            ))}
          </div>

          {/* Live metrics */}
          <div className="mt-6 space-y-3 border-t border-white/10 pt-4">
            {[
              { label: "Throughput", value: "2.4 GB/s", color: "text-blue-400" },
              { label: "Requests", value: "12.4k/s", color: "text-purple-400" },
              { label: "Latency", value: "8ms p99", color: "text-emerald-400" },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex items-center justify-between text-xs">
                <span className="text-white/50">{label}</span>
                <span className={`font-mono font-medium ${color}`}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
