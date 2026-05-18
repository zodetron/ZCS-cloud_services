'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/auth';

const GB = 1024 ** 3;
const MB = 1024 * 1024;

function fmtBytes(b) {
  const n = Number(b);
  if (n === 0) return 'Unlimited';
  if (n >= GB) return `${(n / GB).toFixed(0)} GB`;
  if (n >= MB) return `${(n / MB).toFixed(0)} MB`;
  return `${n} B`;
}

function Section({ title, description, children }) {
  return (
    <div className="bg-white/3 border border-white/8 rounded-xl p-6">
      <div className="mb-5">
        <h2 className="text-base font-semibold text-white">{title}</h2>
        {description && <p className="text-sm text-white/40 mt-0.5">{description}</p>}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Toggle({ label, description, checked, onChange }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-sm text-white/80">{label}</div>
        {description && <div className="text-xs text-white/30 mt-0.5">{description}</div>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-5 rounded-full transition-colors ${checked ? 'bg-blue-500' : 'bg-white/15'}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`}
        />
      </button>
    </div>
  );
}

function Field({ label, description, children }) {
  return (
    <div className="flex items-start justify-between gap-6">
      <div className="min-w-0">
        <div className="text-sm text-white/80">{label}</div>
        {description && <div className="text-xs text-white/30 mt-0.5">{description}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function NumInput({ value, onChange, min, max, step = 1 }) {
  return (
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      min={min}
      max={max}
      step={step}
      className="w-32 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500/50 text-right"
    />
  );
}

function Select({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500/50"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} className="bg-[#0f0f0f]">
          {o.label}
        </option>
      ))}
    </select>
  );
}

function SystemInfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0">
      <span className="text-sm text-white/40">{label}</span>
      <span className="text-sm text-white/80 font-mono">{value}</span>
    </div>
  );
}

function PlanLimitRow({ plan, limits, onChange }) {
  const color = plan === 'enterprise' ? 'text-purple-400' : plan === 'pro' ? 'text-blue-400' : 'text-white/60';
  return (
    <div className="bg-white/3 border border-white/8 rounded-lg p-4">
      <div className={`text-xs font-semibold uppercase tracking-wider mb-3 ${color}`}>{plan}</div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <div className="text-xs text-white/30 mb-1">Rate Limit (req)</div>
          <input
            type="number"
            value={limits.rateLimitMax}
            onChange={(e) => onChange({ ...limits, rateLimitMax: Number(e.target.value) })}
            className="w-full px-2 py-1 bg-white/5 border border-white/10 rounded text-xs text-white focus:outline-none focus:border-blue-500/50"
          />
        </div>
        <div>
          <div className="text-xs text-white/30 mb-1">RL Window (s)</div>
          <input
            type="number"
            value={limits.rateLimitWindow}
            onChange={(e) => onChange({ ...limits, rateLimitWindow: Number(e.target.value) })}
            className="w-full px-2 py-1 bg-white/5 border border-white/10 rounded text-xs text-white focus:outline-none focus:border-blue-500/50"
          />
        </div>
        <div>
          <div className="text-xs text-white/30 mb-1">Storage Cap</div>
          <div className="text-xs text-white/70 py-1">{fmtBytes(limits.storageCap)}</div>
        </div>
        <div>
          <div className="text-xs text-white/30 mb-1">Bucket Cap</div>
          <div className="text-xs text-white/70 py-1">{limits.bucketCap === 0 ? 'Unlimited' : limits.bucketCap}</div>
        </div>
      </div>
    </div>
  );
}

export default function ConfigPage() {
  const { token } = useAuthStore();
  const [cfg, setCfg] = useState(null);
  const [system, setSystem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    const [cfgRes, sysRes] = await Promise.all([
      fetch('/api/admin/config', { headers: { Authorization: `Bearer ${token}` } }),
      fetch('/api/admin/config/system', { headers: { Authorization: `Bearer ${token}` } }),
    ]);
    const { config } = await cfgRes.json();
    const sys = await sysRes.json();
    setCfg(config);
    setSystem(sys);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  function patch(key, value) {
    setCfg((prev) => ({ ...prev, [key]: value }));
  }

  function patchPlanLimit(plan, value) {
    setCfg((prev) => ({
      ...prev,
      planLimits: { ...prev.planLimits, [plan]: value },
    }));
  }

  async function save() {
    setSaving(true);
    try {
      await fetch('/api/admin/config', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(cfg),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  }

  async function reset() {
    if (!confirm('Reset all platform config to defaults?')) return;
    setResetting(true);
    try {
      const res = await fetch('/api/admin/config/reset', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const { config: defaults } = await res.json();
      setCfg(defaults);
    } finally {
      setResetting(false);
    }
  }

  if (!cfg) {
    return (
      <div className="flex items-center justify-center h-48 text-white/30 text-sm">
        Loading config…
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Platform Config</h1>
          <p className="text-white/40 text-sm mt-0.5">Global platform settings stored in Redis</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={reset}
            disabled={resetting}
            className="px-3 py-1.5 text-sm text-white/40 hover:text-white/70 border border-white/10 rounded-lg transition-colors disabled:opacity-40"
          >
            Reset to defaults
          </button>
          <button
            onClick={save}
            disabled={saving}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${
              saved
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-blue-600 hover:bg-blue-500 text-white'
            } disabled:opacity-40`}
          >
            {saved ? 'Saved!' : saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>

      {/* Platform toggles */}
      <Section
        title="Platform"
        description="Controls platform-wide behavior for all tenants"
      >
        <Toggle
          label="Maintenance Mode"
          description="When enabled, the platform is in maintenance — use this to gate API access during migrations"
          checked={cfg.maintenanceMode}
          onChange={(v) => patch('maintenanceMode', v)}
        />
        <div className="border-t border-white/5" />
        <Toggle
          label="Registrations Open"
          description="Allow new tenants to sign up. Disable to pause growth or during maintenance."
          checked={cfg.registrationsOpen}
          onChange={(v) => patch('registrationsOpen', v)}
        />
        <div className="border-t border-white/5" />
        <Toggle
          label="Signup Requires Approval"
          description="New accounts are created in pending state until an admin activates them."
          checked={cfg.signupRequiresApproval}
          onChange={(v) => patch('signupRequiresApproval', v)}
        />
        <div className="border-t border-white/5" />
        <Field
          label="Default Plan for New Signups"
          description="Plan assigned to all newly registered tenants"
        >
          <Select
            value={cfg.defaultPlan}
            onChange={(v) => patch('defaultPlan', v)}
            options={[
              { value: 'free', label: 'Free' },
              { value: 'pro', label: 'Pro' },
              { value: 'enterprise', label: 'Enterprise' },
            ]}
          />
        </Field>
      </Section>

      {/* Storage limits */}
      <Section
        title="Storage Limits"
        description="Hard caps applied to all tenants regardless of plan"
      >
        <Field
          label="Max Buckets per Tenant"
          description="Maximum number of buckets a single tenant can create"
        >
          <NumInput
            value={cfg.maxBucketsPerTenant}
            onChange={(v) => patch('maxBucketsPerTenant', v)}
            min={1}
            max={10000}
          />
        </Field>
        <div className="border-t border-white/5" />
        <Field
          label="Max Objects per Bucket"
          description="Maximum number of objects that can exist in one bucket"
        >
          <NumInput
            value={cfg.maxObjectsPerBucket}
            onChange={(v) => patch('maxObjectsPerBucket', v)}
            min={1}
            max={10000000}
            step={1000}
          />
        </Field>
        <div className="border-t border-white/5" />
        <Field
          label="Max Upload Size"
          description={`Per-object upload limit — currently ${fmtBytes(cfg.maxUploadSizeBytes)}`}
        >
          <Select
            value={String(cfg.maxUploadSizeBytes)}
            onChange={(v) => patch('maxUploadSizeBytes', Number(v))}
            options={[
              { value: String(100 * MB), label: '100 MB' },
              { value: String(500 * MB), label: '500 MB' },
              { value: String(GB), label: '1 GB' },
              { value: String(5 * GB), label: '5 GB' },
              { value: String(10 * GB), label: '10 GB' },
              { value: String(50 * GB), label: '50 GB' },
              { value: String(100 * GB), label: '100 GB' },
            ]}
          />
        </Field>
      </Section>

      {/* Plan defaults */}
      <Section
        title="Plan Rate Limit Defaults"
        description="Default rate limit settings applied when a tenant's plan changes. Does not retroactively override individual customizations."
      >
        {['free', 'pro', 'enterprise'].map((plan) => (
          <PlanLimitRow
            key={plan}
            plan={plan}
            limits={cfg.planLimits[plan]}
            onChange={(v) => patchPlanLimit(plan, v)}
          />
        ))}
      </Section>

      {/* Maintenance mode banner */}
      {cfg.maintenanceMode && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3">
          <span className="text-amber-400 text-lg">⚠</span>
          <div>
            <div className="text-amber-300 font-medium text-sm">Maintenance mode is ON</div>
            <div className="text-amber-300/60 text-xs mt-0.5">
              Tenants may experience degraded or blocked API access. Remember to disable this when done.
            </div>
          </div>
        </div>
      )}

      {/* System info — read only */}
      {system && (
        <Section title="System Info" description="Read-only — reflects live server environment">
          <SystemInfoRow label="Node.js" value={system.nodeVersion} />
          <SystemInfoRow label="Platform" value={system.platform} />
          <SystemInfoRow label="Environment" value={system.env} />
          <SystemInfoRow label="Uptime" value={`${Math.floor(system.uptimeSeconds / 3600)}h ${Math.floor((system.uptimeSeconds % 3600) / 60)}m`} />
          <SystemInfoRow label="Backend Port" value={system.backendPort} />
          <SystemInfoRow label="Database" value={system.database} />
          <SystemInfoRow label="Redis" value={system.redis} />
          <SystemInfoRow label="Object Storage" value={system.storage} />
          <SystemInfoRow label="Storage Bucket" value={system.storageBucket} />
        </Section>
      )}
    </div>
  );
}
