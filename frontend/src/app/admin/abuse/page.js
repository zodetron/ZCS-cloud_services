'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/auth';

const GB = 1024 ** 3;

function fmtBytes(b) {
  const n = Number(b);
  if (n >= GB) return `${(n / GB).toFixed(2)} GB`;
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${n} B`;
}

function SeverityBadge({ severity }) {
  const cls =
    severity === 'high'
      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
      : 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide ${cls}`}>
      {severity}
    </span>
  );
}

function SignalChip({ signal }) {
  const colors = {
    rate_limit_critical: 'bg-red-500/15 text-red-300 border-red-500/25',
    rate_limit_high: 'bg-amber-500/15 text-amber-300 border-amber-500/25',
    upload_spike: 'bg-purple-500/15 text-purple-300 border-purple-500/25',
    egress_spike: 'bg-orange-500/15 text-orange-300 border-orange-500/25',
    request_spike: 'bg-blue-500/15 text-blue-300 border-blue-500/25',
  };
  const cls = colors[signal.type] || 'bg-white/10 text-white/60 border-white/10';
  return (
    <span
      title={signal.detail}
      className={`px-2 py-1 rounded border text-xs font-medium cursor-default ${cls}`}
    >
      {signal.label}
    </span>
  );
}

function RateLimitBar({ percent }) {
  const color = percent >= 95 ? 'bg-red-500' : percent >= 75 ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div className="flex items-center gap-2">
      <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(100, percent)}%` }} />
      </div>
      <span className="text-xs text-white/50">{percent.toFixed(0)}%</span>
    </div>
  );
}

function FlaggedRow({ item, onSuspend, onReset, onIgnore }) {
  const [expanded, setExpanded] = useState(false);
  const [acting, setActing] = useState(null);

  async function act(action) {
    setActing(action);
    await action();
    setActing(null);
  }

  return (
    <>
      <tr
        className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <td className="px-4 py-3">
          <div className="font-medium text-white text-sm">{item.tenantName}</div>
          <div className="text-xs text-white/40">{item.tenantEmail}</div>
        </td>
        <td className="px-4 py-3">
          <SeverityBadge severity={item.severity} />
        </td>
        <td className="px-4 py-3">
          <div className="flex flex-wrap gap-1">
            {item.signals.map((s) => (
              <SignalChip key={s.type} signal={s} />
            ))}
          </div>
        </td>
        <td className="px-4 py-3">
          <RateLimitBar percent={item.stats.rlPercent} />
        </td>
        <td className="px-4 py-3">
          <span className={`text-xs px-2 py-0.5 rounded border ${
            item.plan === 'enterprise' ? 'border-purple-500/30 text-purple-400 bg-purple-500/10' :
            item.plan === 'pro' ? 'border-blue-500/30 text-blue-400 bg-blue-500/10' :
            'border-white/20 text-white/50 bg-white/5'
          }`}>
            {item.plan}
          </span>
        </td>
        <td className="px-4 py-3">
          <span className={`text-xs ${item.status === 'active' ? 'text-emerald-400' : 'text-red-400'}`}>
            {item.status}
          </span>
        </td>
        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
          <div className="flex gap-2">
            <button
              onClick={() => act(onSuspend)}
              disabled={item.status !== 'active' || acting}
              className="px-2 py-1 text-xs bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/25 rounded transition-colors disabled:opacity-40"
            >
              Suspend
            </button>
            <button
              onClick={() => act(onReset)}
              disabled={acting}
              className="px-2 py-1 text-xs bg-white/5 hover:bg-white/10 text-white/60 border border-white/10 rounded transition-colors disabled:opacity-40"
            >
              Reset RL
            </button>
            <button
              onClick={() => act(onIgnore)}
              disabled={acting}
              className="px-2 py-1 text-xs bg-white/5 hover:bg-white/10 text-white/60 border border-white/10 rounded transition-colors disabled:opacity-40"
            >
              Ignore
            </button>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-white/5 bg-white/3">
          <td colSpan={7} className="px-6 py-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-white/40 text-xs mb-1">Rate Limit Usage</div>
                <div className="text-white font-mono">{item.stats.rlCurrent} / {item.stats.rlMax}</div>
              </div>
              <div>
                <div className="text-white/40 text-xs mb-1">Upload (24h)</div>
                <div className="text-white font-mono">{fmtBytes(item.stats.uploadBytes24h)}</div>
              </div>
              <div>
                <div className="text-white/40 text-xs mb-1">Egress (24h)</div>
                <div className="text-white font-mono">{fmtBytes(item.stats.downloadBytes24h)}</div>
              </div>
              <div>
                <div className="text-white/40 text-xs mb-1">API Calls (24h)</div>
                <div className="text-white font-mono">{item.stats.requestCount24h.toLocaleString()}</div>
              </div>
            </div>
            <div className="mt-3 space-y-1">
              {item.signals.map((s) => (
                <div key={s.type} className="flex items-center gap-2 text-xs text-white/50">
                  <SignalChip signal={s} />
                  <span>{s.detail}</span>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function IgnoredRow({ tenant, onUnignore }) {
  const [acting, setActing] = useState(false);
  return (
    <tr className="border-b border-white/5 hover:bg-white/5 transition-colors">
      <td className="px-4 py-3">
        <div className="text-sm text-white/70">{tenant.name}</div>
        <div className="text-xs text-white/30">{tenant.email}</div>
      </td>
      <td className="px-4 py-3">
        <span className="text-xs text-white/40">{tenant.plan}</span>
      </td>
      <td className="px-4 py-3">
        <button
          onClick={async () => {
            setActing(true);
            await onUnignore();
            setActing(false);
          }}
          disabled={acting}
          className="px-2 py-1 text-xs bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/25 rounded transition-colors disabled:opacity-40"
        >
          Unignore
        </button>
      </td>
    </tr>
  );
}

export default function AbusePage() {
  const { token } = useAuthStore();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('flagged');
  const [lastRefresh, setLastRefresh] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/abuse/signals', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      setData(json);
      setLastRefresh(new Date());
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  async function apiAction(method, path) {
    await fetch(`/api/admin${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}` },
    });
    await load();
  }

  async function suspendTenant(tenantId) {
    await fetch(`/api/admin/tenants/${tenantId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'suspended' }),
    });
    await load();
  }

  async function resetRateLimit(tenantId) {
    await fetch(`/api/admin/rate-limits/${tenantId}/reset`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    await load();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Abuse Detection</h1>
          <p className="text-white/40 text-sm mt-0.5">
            Real-time signals from rate limit counters and 24-hour usage data
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastRefresh && (
            <span className="text-xs text-white/30">
              Updated {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={load}
            disabled={loading}
            className="px-3 py-1.5 text-sm bg-white/5 hover:bg-white/10 text-white/70 border border-white/10 rounded-lg transition-colors disabled:opacity-40"
          >
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Summary cards */}
      {data && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
            <div className="text-3xl font-bold text-red-400">{data.counts.high}</div>
            <div className="text-sm text-red-300/70 mt-1">High Risk Tenants</div>
            <div className="text-xs text-white/30 mt-0.5">Rate limit critical or severe spikes</div>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
            <div className="text-3xl font-bold text-amber-400">{data.counts.medium}</div>
            <div className="text-sm text-amber-300/70 mt-1">Medium Risk Tenants</div>
            <div className="text-xs text-white/30 mt-0.5">Elevated usage or rate limit warnings</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="text-3xl font-bold text-white/60">{data.counts.ignored}</div>
            <div className="text-sm text-white/40 mt-1">Ignored Tenants</div>
            <div className="text-xs text-white/30 mt-0.5">Flagged but manually suppressed</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-white/5 rounded-lg p-1 w-fit">
        {['flagged', 'ignored'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${
              tab === t ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70'
            }`}
          >
            {t}
            {data && t === 'flagged' && data.flagged.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-red-500/30 text-red-300 rounded-full">
                {data.flagged.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white/3 border border-white/8 rounded-xl overflow-hidden">
        {loading && !data ? (
          <div className="p-12 text-center text-white/30">Loading abuse signals…</div>
        ) : tab === 'flagged' ? (
          data?.flagged.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-5xl mb-3">✓</div>
              <div className="text-white/50 font-medium">No abuse signals detected</div>
              <div className="text-white/30 text-sm mt-1">All tenants within normal usage thresholds</div>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wide">Tenant</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wide">Severity</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wide">Signals</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wide">RL Usage</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wide">Plan</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.flagged.map((item) => (
                  <FlaggedRow
                    key={item.tenantId}
                    item={item}
                    onSuspend={() => suspendTenant(item.tenantId)}
                    onReset={() => resetRateLimit(item.tenantId)}
                    onIgnore={() => apiAction('POST', `/abuse/ignore/${item.tenantId}`)}
                  />
                ))}
              </tbody>
            </table>
          )
        ) : (
          data?.ignored.length === 0 ? (
            <div className="p-12 text-center text-white/30">No ignored tenants</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wide">Tenant</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wide">Plan</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.ignored.map((t) => (
                  <IgnoredRow
                    key={t.id}
                    tenant={t}
                    onUnignore={() => apiAction('DELETE', `/abuse/ignore/${t.id}`)}
                  />
                ))}
              </tbody>
            </table>
          )
        )}
      </div>

      {data && (
        <div className="text-xs text-white/20 text-right">
          Signals computed at {new Date(data.generatedAt).toLocaleString()} ·
          Upload threshold: 10 GB/24h · Egress threshold: 50 GB/24h · Request threshold: 100k/24h
        </div>
      )}
    </div>
  );
}
