"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export function CodeBlock({ code, language = "bash", className }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn(
      "relative rounded-lg bg-zinc-950 border border-zinc-800 overflow-hidden font-mono text-sm",
      className
    )}>
      {language && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800">
          <span className="text-xs text-zinc-500">{language}</span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <AnimatePresence mode="wait">
              {copied ? (
                <motion.span
                  key="check"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center gap-1 text-emerald-400"
                >
                  <Check className="w-3 h-3" /> Copied
                </motion.span>
              ) : (
                <motion.span
                  key="copy"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" /> Copy
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      )}
      <pre className="p-4 overflow-x-auto">
        <code className="text-zinc-300">{code}</code>
      </pre>
    </div>
  );
}
