"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Bell, Search, Upload, Download, Trash2, FolderPlus, Key, List,
  Activity, X, User, Settings, CreditCard, LogOut, FolderOpen, File,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useAuthStore } from "@/store/auth";
import { BadgeStatus } from "@/components/ui/badge-status";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

// ── Notification config ────────────────────────────────────────────────────
const EVENT_CFG = {
  upload:           { icon: Upload,     color: "text-blue-400 bg-blue-500/10",       label: "File uploaded",   href: "/dashboard/activity" },
  download:         { icon: Download,   color: "text-emerald-400 bg-emerald-500/10", label: "File downloaded", href: "/dashboard/activity" },
  delete:           { icon: Trash2,     color: "text-red-400 bg-red-500/10",         label: "File deleted",    href: "/dashboard/activity" },
  delete_object:    { icon: Trash2,     color: "text-red-400 bg-red-500/10",         label: "File deleted",    href: "/dashboard/activity" },
  create_bucket:    { icon: FolderPlus, color: "text-purple-400 bg-purple-500/10",   label: "Bucket created",  href: "/dashboard/buckets" },
  delete_bucket:    { icon: Trash2,     color: "text-red-400 bg-red-500/10",         label: "Bucket deleted",  href: "/dashboard/buckets" },
  list_buckets:     { icon: List,       color: "text-muted-foreground bg-muted/30",  label: "Buckets listed",  href: "/dashboard/activity" },
  list_objects:     { icon: List,       color: "text-muted-foreground bg-muted/30",  label: "Objects listed",  href: "/dashboard/activity" },
  presign_upload:   { icon: Key,        color: "text-cyan-400 bg-cyan-500/10",       label: "Presigned URL",   href: "/dashboard/activity" },
  presign_download: { icon: Key,        color: "text-cyan-400 bg-cyan-500/10",       label: "Presigned URL",   href: "/dashboard/activity" },
};

function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(date).toLocaleDateString();
}

function useOutsideClick(ref, enabled, onClose) {
  useEffect(() => {
    if (!enabled) return;
    function handle(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [ref, enabled, onClose]);
}

// ── Search ─────────────────────────────────────────────────────────────────
function SearchBar({ router }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const ref = useRef(null);
  const inputRef = useRef(null);
  const timerRef = useRef(null);

  const open = focused && query.trim().length > 0;

  useOutsideClick(ref, open, () => setFocused(false));

  const search = useCallback((q) => {
    if (!q.trim()) { setResults(null); return; }
    setLoading(true);
    api.get(`/api/storage/search?q=${encodeURIComponent(q)}`)
      .then(setResults)
      .catch(() => setResults({ buckets: [], objects: [] }))
      .finally(() => setLoading(false));
  }, []);

  function handleChange(e) {
    const q = e.target.value;
    setQuery(q);
    clearTimeout(timerRef.current);
    if (!q.trim()) { setResults(null); setLoading(false); return; }
    setLoading(true);
    timerRef.current = setTimeout(() => search(q), 300);
  }

  function handleKey(e) {
    if (e.key === "Escape") { setFocused(false); inputRef.current?.blur(); }
  }

  function go(href) {
    setFocused(false);
    setQuery("");
    setResults(null);
    router.push(href);
  }

  const hasResults = results && (results.buckets.length > 0 || results.objects.length > 0);

  return (
    <div className="flex-1 max-w-md relative" ref={ref}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => setFocused(true)}
          onKeyDown={handleKey}
          placeholder="Search buckets, objects..."
          className="w-full h-9 pl-9 pr-4 rounded-lg border border-border/50 bg-muted/30 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
        />
        {query && (
          <button
            onClick={() => { setQuery(""); setResults(null); inputRef.current?.focus(); }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute top-11 left-0 w-full rounded-xl border border-border/50 bg-card shadow-2xl z-[200] overflow-hidden">
          {loading ? (
            <div className="px-4 py-3 space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-6 h-6 rounded bg-muted shrink-0" />
                  <div className="flex-1 space-y-1">
                    <div className="h-2.5 bg-muted rounded w-1/2" />
                    <div className="h-2 bg-muted rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : !hasResults ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground/50">
              No results for <span className="text-foreground font-mono">"{query}"</span>
            </div>
          ) : (
            <div className="py-1 max-h-80 overflow-y-auto">
              {results.buckets.length > 0 && (
                <>
                  <p className="px-4 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Buckets</p>
                  {results.buckets.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => go("/dashboard/buckets")}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors text-left"
                    >
                      <div className="w-6 h-6 rounded bg-blue-500/10 flex items-center justify-center shrink-0">
                        <FolderOpen className="w-3 h-3 text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground font-mono truncate">{b.name}</p>
                        <p className="text-xs text-muted-foreground">{b.region}</p>
                      </div>
                    </button>
                  ))}
                </>
              )}

              {results.objects.length > 0 && (
                <>
                  <p className="px-4 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-1">Objects</p>
                  {results.objects.map((o) => (
                    <button
                      key={o.id}
                      onClick={() => go("/dashboard/buckets")}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors text-left"
                    >
                      <div className="w-6 h-6 rounded bg-muted/40 flex items-center justify-center shrink-0">
                        <File className="w-3 h-3 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground font-mono truncate">{o.key}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {o.bucket?.name} · {o.contentType}
                        </p>
                      </div>
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Topbar ────────────────────────────────────────────────────────────
export function Topbar() {
  const { tenant, logout } = useAuthStore();
  const router = useRouter();

  // Notifications
  const [notifOpen, setNotifOpen] = useState(false);
  const [events, setEvents] = useState([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [seenId, setSeenId] = useState(null);
  const notifRef = useRef(null);

  // Profile
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  useOutsideClick(notifRef, notifOpen, () => setNotifOpen(false));
  useOutsideClick(profileRef, profileOpen, () => setProfileOpen(false));

  useEffect(() => {
    if (!notifOpen) return;
    setNotifLoading(true);
    api.get("/api/usage/events?limit=10")
      .then((d) => setEvents(d.events || []))
      .catch(() => {})
      .finally(() => setNotifLoading(false));
  }, [notifOpen]);

  const hasUnread = !seenId || (events.length > 0 && events[0].id !== seenId);

  function goNotif(href) { setNotifOpen(false); router.push(href); }

  return (
    <header className="h-16 border-b border-border/50 bg-background/80 backdrop-blur-sm flex items-center px-6 gap-4 shrink-0 relative z-40">
      <SearchBar router={router} />

      <div className="flex items-center gap-3 ml-auto">
        <BadgeStatus status={tenant?.plan || "free"} />
        <ThemeToggle />

        {/* Bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen((v) => !v)}
            className="w-9 h-9 rounded-lg border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors relative"
          >
            <Bell className="w-4 h-4" />
            {hasUnread && events.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-blue-500" />
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-11 w-80 rounded-xl border border-border/50 bg-card shadow-2xl z-[200] overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
                <div className="flex items-center gap-2">
                  <Bell className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-sm font-semibold text-foreground">Notifications</span>
                  {hasUnread && events.length > 0 && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-mono">new</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {hasUnread && events.length > 0 && (
                    <button onClick={() => setSeenId(events[0].id)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                      Mark read
                    </button>
                  )}
                  <button onClick={() => setNotifOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-border/20">
                {notifLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
                      <div className="w-7 h-7 rounded-lg bg-muted shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-2.5 bg-muted rounded w-2/3" />
                        <div className="h-2 bg-muted rounded w-1/3" />
                      </div>
                    </div>
                  ))
                ) : events.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground/40">
                    <Activity className="w-6 h-6" />
                    <p className="text-xs">No activity yet</p>
                  </div>
                ) : (
                  events.map((event, idx) => {
                    const cfg = EVENT_CFG[event.eventType] || { icon: Activity, color: "text-muted-foreground bg-muted/30", label: event.eventType, href: "/dashboard/activity" };
                    const Icon = cfg.icon;
                    const isNew = !seenId || idx < events.findIndex((x) => x.id === seenId);
                    return (
                      <button
                        key={event.id}
                        onClick={() => goNotif(cfg.href)}
                        className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-muted/20 transition-colors text-left ${isNew ? "bg-blue-500/5" : ""}`}
                      >
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${cfg.color}`}>
                          <Icon className="w-3 h-3" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground font-medium">{cfg.label}</p>
                          <p className="text-xs text-muted-foreground truncate">{event.objectKey || event.bucketName || "—"}</p>
                        </div>
                        <span className="text-xs text-muted-foreground/60 shrink-0 pt-0.5">{timeAgo(event.createdAt)}</span>
                      </button>
                    );
                  })
                )}
              </div>

              {events.length > 0 && (
                <div className="border-t border-border/30 px-4 py-2.5">
                  <button onClick={() => goNotif("/dashboard/activity")} className="text-xs text-blue-400 hover:text-blue-300 transition-colors w-full text-center">
                    View all activity →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Avatar */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileOpen((v) => !v)}
            className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold hover:ring-2 hover:ring-blue-500/50 transition-all"
          >
            {tenant?.name?.[0]?.toUpperCase() || "U"}
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-11 w-56 rounded-xl border border-border/50 bg-card shadow-2xl z-[200] overflow-hidden">
              <div className="px-4 py-3 border-b border-border/30">
                <p className="text-sm font-semibold text-foreground truncate">{tenant?.name || "User"}</p>
                <p className="text-xs text-muted-foreground truncate">{tenant?.email}</p>
              </div>
              <div className="py-1">
                {[
                  { icon: User,       label: "Profile",  href: "/dashboard/profile" },
                  { icon: Settings,   label: "Settings", href: "/dashboard/settings" },
                  { icon: CreditCard, label: "Billing",  href: "/dashboard/billing" },
                ].map(({ icon: Icon, label, href }) => (
                  <button
                    key={href}
                    onClick={() => { setProfileOpen(false); router.push(href); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
                  >
                    <Icon className="w-3.5 h-3.5" /> {label}
                  </button>
                ))}
              </div>
              <div className="border-t border-border/30 py-1">
                <button
                  onClick={() => { logout(); router.replace("/auth/login"); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" /> Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
