"use client";

import { motion } from "framer-motion";
import { Database, ArrowLeft, Home } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background grid-pattern flex items-center justify-center p-6">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center"
      >
        <div className="flex justify-center mb-8">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-border/50 flex items-center justify-center">
            <Database className="w-10 h-10 text-muted-foreground" />
          </div>
        </div>

        <div className="text-8xl font-bold gradient-text mb-4">404</div>
        <h1 className="text-2xl font-bold text-foreground mb-3">Object not found</h1>
        <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
          The page you&apos;re looking for doesn&apos;t exist or has been moved to a different location.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm font-medium hover:from-blue-400 hover:to-blue-500 transition-all"
          >
            <Home className="w-4 h-4" /> Go home
          </Link>
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg border border-border/50 text-muted-foreground text-sm hover:text-foreground hover:bg-muted/50 transition-all"
          >
            <ArrowLeft className="w-4 h-4" /> Go back
          </button>
        </div>
      </motion.div>
    </div>
  );
}
