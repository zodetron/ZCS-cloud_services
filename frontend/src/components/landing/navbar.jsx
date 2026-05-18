"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ChevronRight, Cloud } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const navLinks = [
  { label: "Product", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "Developers", href: "#developers" },
  { label: "Docs", href: "/docs" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          "fixed top-0 inset-x-0 z-50 transition-all duration-500",
          scrolled
            ? "bg-black/70 backdrop-blur-2xl border-b border-white/[0.05] shadow-xl shadow-black/20"
            : "bg-transparent"
        )}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="relative w-8 h-8 rounded-xl overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-violet-500 to-blue-600" />
              <div className="animate-spin-slow absolute -inset-2 bg-gradient-to-r from-blue-400/40 to-violet-400/40 blur-md" />
              <Cloud className="relative w-4 h-4 text-white m-2" />
            </div>
            <div>
              <span className="font-bold text-white tracking-tight">ZCS</span>
              <p className="text-[11px] text-white font-bold leading-none mt-0.5">built by hardik with ❤️ for ZOHO SETU</p>
            </div>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="relative px-4 py-2 text-sm text-white/50 hover:text-white transition-colors duration-200 group"
              >
                {link.label}
                <span className="absolute inset-x-4 -bottom-0 h-px bg-gradient-to-r from-blue-500/0 via-blue-400 to-blue-500/0 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-center" />
              </a>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-3">
              <Link
                href="/auth/login"
                className="text-sm text-white/50 hover:text-white transition-colors px-3 py-2"
              >
                Sign in
              </Link>
              <Link
                href="/auth/register"
                className="group flex items-center gap-1.5 px-4 py-2 rounded-full bg-white text-black text-sm font-semibold hover:bg-white/90 transition-all duration-200 hover:scale-[1.03] hover:shadow-[0_0_20px_rgba(255,255,255,0.15)]"
              >
                Get started
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 text-white/50 hover:text-white transition-colors"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </motion.nav>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="fixed top-16 inset-x-0 z-40 bg-black/95 backdrop-blur-2xl border-b border-white/[0.05] px-6 py-4 space-y-1 md:hidden"
          >
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="block px-4 py-3 text-white/60 hover:text-white text-sm rounded-xl hover:bg-white/5 transition-colors"
              >
                {link.label}
              </a>
            ))}
            <div className="pt-3 border-t border-white/[0.05] space-y-2">
              <Link href="/auth/login" className="block px-4 py-3 text-sm text-white/50 hover:text-white text-center transition-colors">
                Sign in
              </Link>
              <Link href="/auth/register" className="block px-4 py-3 text-sm font-semibold bg-white text-black rounded-full text-center hover:bg-white/90 transition-colors">
                Get started free
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
