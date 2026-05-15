"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function GradientButton({ children, className, size = "default", variant = "primary", onClick, href, disabled, ...props }) {
  const sizes = {
    sm: "px-4 py-2 text-sm",
    default: "px-6 py-2.5 text-sm",
    lg: "px-8 py-3 text-base",
    xl: "px-10 py-4 text-lg",
  };

  const variants = {
    primary: "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white shadow-lg shadow-blue-500/25",
    secondary: "bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-400 hover:to-purple-500 text-white shadow-lg shadow-purple-500/25",
    outline: "border border-border/50 bg-background/50 hover:bg-muted/50 text-foreground backdrop-blur-sm",
    ghost: "hover:bg-muted/50 text-foreground",
  };

  const base = cn(
    "relative inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
    sizes[size],
    variants[variant],
    className
  );

  if (href) {
    return (
      <motion.a
        href={href}
        whileHover={{ scale: disabled ? 1 : 1.02 }}
        whileTap={{ scale: disabled ? 1 : 0.98 }}
        className={base}
        {...props}
      >
        {children}
      </motion.a>
    );
  }

  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      onClick={onClick}
      disabled={disabled}
      className={base}
      {...props}
    >
      {children}
    </motion.button>
  );
}
