"use client";

import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { LoadingSpinner } from "./loading-spinner";
import { EmptyState } from "./empty-state";
import { Database } from "lucide-react";

export function DataTable({ columns, data, loading, emptyTitle = "No data", emptyDescription, className }) {
  return (
    <div className={cn("rounded-xl border border-border/50 overflow-hidden", className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50 bg-muted/30">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "h-11 px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider",
                    col.className
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="h-32">
                  <div className="flex items-center justify-center">
                    <LoadingSpinner />
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  <EmptyState
                    icon={Database}
                    title={emptyTitle}
                    description={emptyDescription}
                  />
                </td>
              </tr>
            ) : (
              <AnimatePresence>
                {data.map((row, i) => (
                  <motion.tr
                    key={row.id || i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03, duration: 0.2 }}
                    className="border-b border-border/30 hover:bg-muted/20 transition-colors"
                  >
                    {columns.map((col) => (
                      <td key={col.key} className={cn("h-14 px-4", col.cellClassName)}>
                        {col.render ? col.render(row) : row[col.key]}
                      </td>
                    ))}
                  </motion.tr>
                ))}
              </AnimatePresence>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
