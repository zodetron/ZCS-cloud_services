"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";
import {
  Database,
  LayoutDashboard,
  Users,
  Server,
  CreditCard,
  Shield,
  AlertTriangle,
  FileText,
  Settings,
  BookOpen,
  LogOut,
} from "lucide-react";

const navItems = [
  { icon: LayoutDashboard, label: "Overview", href: "/admin" },
  { icon: Users, label: "Tenants", href: "/admin/tenants" },
  { icon: Server, label: "Infrastructure", href: "/admin/infrastructure" },
  { icon: CreditCard, label: "Pricing", href: "/admin/pricing" },
  { icon: Shield, label: "Rate Limits", href: "/admin/rate-limits" },
  { icon: AlertTriangle, label: "Abuse Detection", href: "/admin/abuse" },
  { icon: FileText, label: "Audit Logs", href: "/admin/logs" },
  { icon: Settings, label: "Platform Config", href: "/admin/config" },
  { icon: BookOpen, label: "Help & Docs", href: "/docs" },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { logout } = useAuthStore();

  return (
    <aside className="w-56 flex flex-col h-full border-r border-border/50 bg-card/50 shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 h-16 border-b border-border/30">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
          <Shield className="w-3.5 h-3.5 text-white" />
        </div>
        <div>
          <span className="font-bold text-sm text-foreground">Admin Console</span>
          <p className="text-xs text-muted-foreground">Zodetron Cloud Services</p>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5">
        {navItems.map(({ icon: Icon, label, href }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all",
                active
                  ? "bg-red-500/10 border border-red-500/20 text-red-400"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-border/30">
        <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all mb-1">
          <Database className="w-4 h-4" />
          Back to Dashboard
        </Link>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-all"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
