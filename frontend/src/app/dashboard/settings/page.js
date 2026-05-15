"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { User, Shield, Bell, CreditCard, Save, Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { GradientButton } from "@/components/ui/gradient-button";
import { useAuthStore } from "@/store/auth";
import { BadgeStatus } from "@/components/ui/badge-status";
import { api } from "@/lib/api";

const tabs = [
  { id: "profile", label: "Profile", icon: User },
  { id: "security", label: "Security", icon: Shield },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "billing", label: "Plan", icon: CreditCard },
];

function Toggle({ on, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className={`w-11 h-6 rounded-full transition-colors ${on ? "bg-blue-500" : "bg-muted"}`}
    >
      <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform mx-1 ${on ? "translate-x-5" : "translate-x-0"}`} />
    </button>
  );
}

function NotificationRow({ label, desc, initial }) {
  const [on, setOn] = useState(initial);
  return (
    <div className="flex items-center justify-between py-3 border-b border-border/20 last:border-0">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <Toggle on={on} onToggle={() => setOn(!on)} />
    </div>
  );
}

export default function SettingsPage() {
  const { tenant, updateTenant } = useAuthStore();
  const [activeTab, setActiveTab] = useState("profile");

  // Profile
  const [name, setName] = useState(tenant?.name || "");
  const [email, setEmail] = useState(tenant?.email || "");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState(null);

  // Security
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [securitySaving, setSecuritySaving] = useState(false);
  const [securityMsg, setSecurityMsg] = useState(null);

  async function handleProfileSave() {
    setProfileSaving(true);
    setProfileMsg(null);
    try {
      const data = await api.patch("/api/auth/me", { name, email });
      if (updateTenant) updateTenant(data.tenant);
      setProfileMsg({ ok: true, text: "Profile updated." });
    } catch (e) {
      setProfileMsg({ ok: false, text: e.message });
    } finally {
      setProfileSaving(false);
    }
  }

  async function handlePasswordSave() {
    if (newPassword !== confirmPassword) {
      setSecurityMsg({ ok: false, text: "Passwords do not match." });
      return;
    }
    setSecuritySaving(true);
    setSecurityMsg(null);
    try {
      await api.patch("/api/auth/me", { currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSecurityMsg({ ok: true, text: "Password updated." });
    } catch (e) {
      setSecurityMsg({ ok: false, text: e.message });
    } finally {
      setSecuritySaving(false);
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-3xl">
      <PageHeader title="Settings" description="Manage your account and preferences." />

      <div className="flex gap-1 p-1 rounded-lg bg-muted/30 border border-border/30 w-fit">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm transition-all ${
              activeTab === id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-border/50 bg-card p-6">
        {activeTab === "profile" && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-2xl font-bold">
                {tenant?.name?.[0]?.toUpperCase() || "U"}
              </div>
              <div>
                <p className="font-semibold text-foreground">{tenant?.name}</p>
                <p className="text-sm text-muted-foreground">{tenant?.email}</p>
                <BadgeStatus status={tenant?.plan || "free"} className="mt-1" />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Full name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-border/50 bg-background/50 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Email address</label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-border/50 bg-background/50 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                />
              </div>
            </div>

            {profileMsg && (
              <p className={`text-sm flex items-center gap-1.5 ${profileMsg.ok ? "text-emerald-400" : "text-red-400"}`}>
                {profileMsg.ok ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                {profileMsg.text}
              </p>
            )}

            <GradientButton onClick={handleProfileSave} disabled={profileSaving}>
              {profileSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {profileSaving ? "Saving..." : "Save changes"}
            </GradientButton>
          </div>
        )}

        {activeTab === "security" && (
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-foreground mb-1">Change password</h3>
              <p className="text-sm text-muted-foreground mb-4">Use a strong, unique password.</p>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Current password</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-border/50 bg-background/50 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">New password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-border/50 bg-background/50 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Confirm new password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-border/50 bg-background/50 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                  />
                </div>
              </div>

              {securityMsg && (
                <p className={`text-sm flex items-center gap-1.5 mt-3 ${securityMsg.ok ? "text-emerald-400" : "text-red-400"}`}>
                  {securityMsg.ok ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                  {securityMsg.text}
                </p>
              )}

              <GradientButton className="mt-4" onClick={handlePasswordSave} disabled={securitySaving || !currentPassword || !newPassword}>
                {securitySaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {securitySaving ? "Updating..." : "Update password"}
              </GradientButton>
            </div>

            <div className="pt-6 border-t border-border/30">
              <h3 className="font-semibold text-foreground mb-1">Two-factor authentication</h3>
              <p className="text-sm text-muted-foreground mb-4">Add an extra layer of security to your account.</p>
              <button className="px-4 py-2 rounded-lg border border-border/50 text-sm text-muted-foreground hover:bg-muted/50 transition-colors">
                Enable 2FA
              </button>
            </div>
          </div>
        )}

        {activeTab === "notifications" && (
          <div className="space-y-4">
            <NotificationRow label="Storage quota alerts" desc="Notify when storage exceeds 80%" initial={true} />
            <NotificationRow label="Invoice generated" desc="Monthly billing notifications" initial={true} />
            <NotificationRow label="API key activity" desc="Alerts for unusual API key usage" initial={false} />
            <NotificationRow label="Security events" desc="Login attempts and API changes" initial={true} />
          </div>
        )}

        {activeTab === "billing" && (
          <div className="space-y-6">
            <div className="p-4 rounded-lg border border-border/50 bg-muted/20 flex items-center justify-between">
              <div>
                <p className="font-semibold text-foreground capitalize">{tenant?.plan || "Free"} Plan</p>
                <p className="text-sm text-muted-foreground">5 GB storage, 10k requests/month</p>
              </div>
              <GradientButton variant="secondary">Upgrade to Pro</GradientButton>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-4">Plan comparison</h3>
              {[
                { feature: "Storage", free: "5 GB", pro: "100 GB", enterprise: "Unlimited" },
                { feature: "API Requests", free: "10k/mo", pro: "1M/mo", enterprise: "Unlimited" },
                { feature: "Egress", free: "1 GB/mo", pro: "50 GB/mo", enterprise: "Custom" },
                { feature: "Buckets", free: "1", pro: "Unlimited", enterprise: "Unlimited" },
                { feature: "Support", free: "Community", pro: "Priority", enterprise: "Dedicated" },
              ].map(({ feature, free, pro, enterprise }) => (
                <div key={feature} className="grid grid-cols-4 gap-4 py-2 border-b border-border/20 text-sm last:border-0">
                  <span className="text-muted-foreground">{feature}</span>
                  <span className="text-foreground font-medium">{free}</span>
                  <span className="text-blue-400 font-medium">{pro}</span>
                  <span className="text-purple-400 font-medium">{enterprise}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
