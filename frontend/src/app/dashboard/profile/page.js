"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  User, Mail, Calendar, Shield, Key, FolderOpen, Activity,
  Edit2, Save, Loader2, CheckCircle, AlertTriangle, LogOut, ExternalLink,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { GradientButton } from "@/components/ui/gradient-button";
import { BadgeStatus } from "@/components/ui/badge-status";
import { useAuthStore } from "@/store/auth";
import { api } from "@/lib/api";
import Link from "next/link";
import { useRouter } from "next/navigation";

const PLAN_COLORS = {
  free:       "from-slate-400 to-slate-500",
  pro:        "from-blue-400 to-blue-600",
  enterprise: "from-purple-400 to-purple-600",
  admin:      "from-red-400 to-red-600",
};

const AVATAR_COLORS = [
  "from-blue-400 to-purple-500",
  "from-emerald-400 to-cyan-500",
  "from-orange-400 to-pink-500",
  "from-violet-400 to-indigo-500",
];

function avatarColor(name) {
  let n = 0;
  for (const c of (name || "")) n += c.charCodeAt(0);
  return AVATAR_COLORS[n % AVATAR_COLORS.length];
}

function StatBox({ icon: Icon, label, value, href }) {
  const inner = (
    <div className="flex flex-col items-center gap-1 p-4 rounded-xl border border-border/40 bg-muted/20 hover:bg-muted/40 transition-colors">
      <Icon className="w-5 h-5 text-muted-foreground mb-1" />
      <span className="text-xl font-bold text-foreground">{value ?? "—"}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

export default function ProfilePage() {
  const router = useRouter();
  const { tenant, updateTenant, logout } = useAuthStore();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(tenant?.name || "");
  const [email, setEmail] = useState(tenant?.email || "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const [stats, setStats] = useState(null);
  const [keyCount, setKeyCount] = useState(null);

  useEffect(() => {
    api.get("/api/usage/summary").then(setStats).catch(() => {});
    api.get("/api/keys").then((d) => setKeyCount((d.apiKeys || []).length)).catch(() => {});
  }, []);

  useEffect(() => {
    setName(tenant?.name || "");
    setEmail(tenant?.email || "");
  }, [tenant]);

  async function handleSave() {
    setSaving(true);
    setMsg(null);
    try {
      const data = await api.patch("/api/auth/me", { name, email });
      updateTenant(data.tenant);
      setMsg({ ok: true, text: "Profile updated." });
      setEditing(false);
    } catch (e) {
      setMsg({ ok: false, text: e.message });
    } finally {
      setSaving(false);
    }
  }

  function handleLogout() {
    logout();
    router.replace("/auth/login");
  }

  const grad = avatarColor(tenant?.name);
  const planGrad = PLAN_COLORS[tenant?.plan] || PLAN_COLORS.free;
  const initials = (tenant?.name || "U").split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-2xl">
      <PageHeader title="Profile" description="Your account details and activity." />

      {/* Profile card */}
      <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
        {/* Banner */}
        <div className={`h-24 bg-gradient-to-r ${planGrad} opacity-20`} />

        <div className="px-6 pb-6">
          {/* Avatar row */}
          <div className="flex items-end justify-between -mt-10 mb-4">
            <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${grad} flex items-center justify-center text-white text-2xl font-bold border-4 border-card shadow-lg`}>
              {initials}
            </div>
            <div className="flex gap-2 mb-1">
              {editing ? (
                <>
                  <button
                    onClick={() => { setEditing(false); setMsg(null); setName(tenant?.name || ""); setEmail(tenant?.email || ""); }}
                    className="px-3 py-1.5 rounded-lg border border-border/50 text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
                  >
                    Cancel
                  </button>
                  <GradientButton onClick={handleSave} disabled={saving}>
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Save
                  </GradientButton>
                </>
              ) : (
                <button
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/50 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Edit
                </button>
              )}
            </div>
          </div>

          {/* Name / email fields */}
          {editing ? (
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Full name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-border/50 bg-background/50 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Email</label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-border/50 bg-background/50 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                />
              </div>
              {msg && (
                <p className={`text-sm flex items-center gap-1.5 ${msg.ok ? "text-emerald-400" : "text-red-400"}`}>
                  {msg.ok ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                  {msg.text}
                </p>
              )}
            </div>
          ) : (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-bold text-foreground">{tenant?.name || "—"}</h2>
                <BadgeStatus status={tenant?.plan || "free"} />
              </div>
              <p className="text-sm text-muted-foreground">{tenant?.email}</p>
            </div>
          )}

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="w-3.5 h-3.5 shrink-0" />
              <span className="font-mono text-xs truncate">{tenant?.id?.slice(0, 16)}…</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Shield className="w-3.5 h-3.5 shrink-0" />
              <span className="text-xs capitalize">{tenant?.role?.replace("_", " ") || "tenant"}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="w-3.5 h-3.5 shrink-0" />
              <span className="text-xs truncate">{tenant?.email}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              <span className="text-xs">
                {tenant?.createdAt ? `Joined ${new Date(tenant.createdAt).toLocaleDateString()}` : "—"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatBox icon={FolderOpen} label="Objects" value={stats?.objectCount ?? "—"} href="/dashboard/buckets" />
        <StatBox icon={Activity}   label="Requests" value={stats?.requestCount ?? "—"} href="/dashboard/activity" />
        <StatBox icon={Key}        label="API Keys" href="/dashboard/api-keys" value={keyCount ?? "—"} />
      </div>

      {/* Quick links */}
      <div className="rounded-xl border border-border/50 bg-card divide-y divide-border/20">
        {[
          { label: "Account Settings", desc: "Update password and preferences", href: "/dashboard/settings", icon: Shield },
          { label: "Billing & Plan", desc: "View invoices and usage costs", href: "/dashboard/billing", icon: Activity },
          { label: "API Keys", desc: "Manage your API credentials", href: "/dashboard/api-keys", icon: Key },
        ].map(({ label, desc, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center justify-between px-5 py-4 hover:bg-muted/20 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-muted/40 flex items-center justify-center">
                <Icon className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
          </Link>
        ))}
      </div>

      {/* Sign out */}
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">Sign out</p>
          <p className="text-xs text-muted-foreground">End your current session</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 text-sm hover:bg-red-500/10 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" /> Sign out
        </button>
      </div>
    </motion.div>
  );
}
