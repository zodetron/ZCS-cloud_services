'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

const BASE = 'https://zcs-bfm3.onrender.com';

// ── Copy button ───────────────────────────────────────────────────────────────
function CopyBtn({ text }) {
  const [done, setDone] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text);
    setDone(true);
    setTimeout(() => setDone(false), 1800);
  }
  return (
    <button
      onClick={copy}
      className={`absolute top-3 right-3 px-2.5 py-1 rounded text-xs font-medium transition-all ${
        done
          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
          : 'bg-white/8 text-white/40 border border-white/10 hover:bg-white/12 hover:text-white/70'
      }`}
    >
      {done ? '✓ Copied' : 'Copy'}
    </button>
  );
}

// ── Code block ────────────────────────────────────────────────────────────────
function Code({ lang, children }) {
  return (
    <div className="relative group mt-3">
      {lang && (
        <div className="absolute top-3 left-3 text-[10px] font-mono text-white/20 uppercase tracking-widest">
          {lang}
        </div>
      )}
      <pre className={`bg-[#0d0d0d] border border-white/8 rounded-xl text-xs text-white/75 overflow-x-auto whitespace-pre font-mono leading-6 ${lang ? 'pt-8 pb-4 px-4' : 'p-4'}`}>
        {children}
      </pre>
      <CopyBtn text={children} />
    </div>
  );
}

// ── Method badge ──────────────────────────────────────────────────────────────
const METHOD_STYLE = {
  GET:    'bg-emerald-500/15 text-emerald-300 border-emerald-500/25',
  POST:   'bg-blue-500/15 text-blue-300 border-blue-500/25',
  PUT:    'bg-violet-500/15 text-violet-300 border-violet-500/25',
  PATCH:  'bg-amber-500/15 text-amber-300 border-amber-500/25',
  DELETE: 'bg-red-500/15 text-red-300 border-red-500/25',
};
function Method({ m }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded border text-xs font-bold font-mono w-16 justify-center ${METHOD_STYLE[m]}`}>
      {m}
    </span>
  );
}

// ── Auth badge ────────────────────────────────────────────────────────────────
function AuthBadge({ type }) {
  const map = {
    'API Key':  'bg-purple-500/10 text-purple-400 border-purple-500/20',
    'JWT':      'bg-blue-500/10 text-blue-400 border-blue-500/20',
    'None':     'bg-white/5 text-white/30 border-white/10',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded border text-xs ${map[type] || map['None']}`}>
      {type === 'API Key' && '🔑'}{type === 'JWT' && '🪪'}{type === 'None' && '🔓'}
      {type}
    </span>
  );
}

// ── Endpoint header ───────────────────────────────────────────────────────────
function Endpoint({ method, path, auth, summary }) {
  return (
    <div className="mt-8 mb-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Method m={method} />
        <code className="font-mono text-sm text-white/90 bg-white/5 px-3 py-1 rounded-lg border border-white/8">
          {path}
        </code>
        <AuthBadge type={auth} />
      </div>
      {summary && <p className="mt-2 text-sm text-white/50">{summary}</p>}
    </div>
  );
}

// ── Callout ───────────────────────────────────────────────────────────────────
function Callout({ type = 'info', children }) {
  const styles = {
    info:    'bg-blue-500/8 border-blue-500/20 text-blue-200',
    warn:    'bg-amber-500/8 border-amber-500/20 text-amber-200',
    tip:     'bg-emerald-500/8 border-emerald-500/20 text-emerald-200',
    danger:  'bg-red-500/8 border-red-500/20 text-red-200',
  };
  const icons = { info: 'ℹ', warn: '⚠', tip: '✦', danger: '✕' };
  return (
    <div className={`my-4 flex gap-3 rounded-xl border p-4 text-sm leading-relaxed ${styles[type]}`}>
      <span className="shrink-0 opacity-70">{icons[type]}</span>
      <div>{children}</div>
    </div>
  );
}

// ── Param table ───────────────────────────────────────────────────────────────
function ParamTable({ title, rows }) {
  return (
    <div className="my-4">
      <div className="text-xs font-semibold text-white/25 uppercase tracking-widest mb-2">{title}</div>
      <div className="rounded-xl border border-white/8 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-white/3 border-b border-white/8">
              <th className="px-4 py-2 text-left text-xs font-medium text-white/30 w-40">Name</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-white/30 w-24">Type</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-white/30">Description</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([name, type, desc, required]) => (
              <tr key={name} className="border-b border-white/5 last:border-0">
                <td className="px-4 py-2.5 font-mono text-xs">
                  <span className="text-purple-300">{name}</span>
                  {required && <span className="ml-1 text-red-400 text-[10px]">*</span>}
                </td>
                <td className="px-4 py-2.5 text-xs text-amber-300/80 font-mono">{type}</td>
                <td className="px-4 py-2.5 text-xs text-white/45">{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ id, title, children }) {
  return (
    <section id={id} className="scroll-mt-6 py-10 border-b border-white/5 last:border-0">
      <h2 className="text-xl font-bold text-white mb-1">{title}</h2>
      <div className="w-8 h-0.5 bg-gradient-to-r from-blue-500 to-violet-500 mb-6 rounded" />
      {children}
    </section>
  );
}

function SubSection({ id, title, children }) {
  return (
    <div id={id} className="scroll-mt-6 mt-10">
      <h3 className="text-base font-semibold text-white/90 mb-4">{title}</h3>
      {children}
    </div>
  );
}

// ── TOC ───────────────────────────────────────────────────────────────────────
const TOC = [
  { id: 'introduction',   label: 'Introduction' },
  { id: 'base-url',       label: 'Base URL' },
  { id: 'authentication', label: 'Authentication', children: [
    { id: 'api-keys-intro',  label: 'What are API Keys' },
    { id: 'generate-key',    label: 'Generate a Key' },
    { id: 'using-key',       label: 'Using Your Key' },
  ]},
  { id: 'rate-limits',    label: 'Rate Limits' },
  { id: 'errors',         label: 'Errors' },
  { id: 'buckets',        label: 'Buckets', children: [
    { id: 'list-buckets',   label: 'List Buckets' },
    { id: 'create-bucket',  label: 'Create Bucket' },
    { id: 'delete-bucket',  label: 'Delete Bucket' },
  ]},
  { id: 'objects',        label: 'Objects', children: [
    { id: 'list-objects',   label: 'List Objects' },
    { id: 'upload-text',    label: 'Upload Text / JSON' },
    { id: 'upload-file',    label: 'Upload Binary File' },
    { id: 'download',       label: 'Download Object' },
    { id: 'delete-object',  label: 'Delete Object' },
  ]},
  { id: 'presigned',      label: 'Presigned URLs', children: [
    { id: 'presign-upload',   label: 'Upload URL' },
    { id: 'presign-download', label: 'Download URL' },
    { id: 'confirm-upload',   label: 'Confirm Upload' },
  ]},
  { id: 'search',         label: 'Search' },
  { id: 'usage',          label: 'Usage & Billing', children: [
    { id: 'usage-summary',  label: 'Usage Summary' },
    { id: 'usage-history',  label: 'Usage History' },
    { id: 'cost-estimate',  label: 'Cost Estimate' },
    { id: 'invoices',       label: 'Invoices' },
  ]},
];

function TableOfContents({ active }) {
  return (
    <nav className="w-52 shrink-0">
      <div className="sticky top-0 pt-1 space-y-0.5 text-sm max-h-[calc(100vh-80px)] overflow-y-auto pr-2 scrollbar-none">
        <div className="text-[10px] font-semibold text-white/20 uppercase tracking-widest px-3 pb-2 pt-1">On this page</div>
        {TOC.map((item) => (
          <div key={item.id}>
            <a
              href={`#${item.id}`}
              className={`block px-3 py-1.5 rounded-lg text-sm transition-colors ${
                active === item.id
                  ? 'text-blue-400 bg-blue-500/10'
                  : 'text-white/35 hover:text-white/70 hover:bg-white/5'
              }`}
            >
              {item.label}
            </a>
            {item.children?.map((child) => (
              <a
                key={child.id}
                href={`#${child.id}`}
                className={`block pl-6 pr-3 py-1 rounded-lg text-xs transition-colors ${
                  active === child.id
                    ? 'text-blue-400 bg-blue-500/10'
                    : 'text-white/25 hover:text-white/60 hover:bg-white/5'
                }`}
              >
                {child.label}
              </a>
            ))}
          </div>
        ))}
      </div>
    </nav>
  );
}

// ── Step ──────────────────────────────────────────────────────────────────────
function Step({ n, title, children }) {
  return (
    <div className="flex gap-4 mt-6">
      <div className="shrink-0 w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center mt-0.5">
        {n}
      </div>
      <div className="flex-1">
        <div className="font-medium text-white/80 mb-2">{title}</div>
        {children}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function DocsPage() {
  const [active, setActive] = useState('introduction');
  const contentRef = useRef(null);

  useEffect(() => {
    const allIds = TOC.flatMap((t) => [t.id, ...(t.children?.map((c) => c.id) || [])]);
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(entry.target.id);
            break;
          }
        }
      },
      { rootMargin: '-10% 0px -80% 0px', threshold: 0 }
    );
    allIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="flex gap-8 min-h-full">
      <TableOfContents active={active} />

      {/* ── Content ── */}
      <div ref={contentRef} className="flex-1 min-w-0 pb-20">

        {/* ─────────────── INTRODUCTION ──────────────────────────────────── */}
        <Section id="introduction" title="Introduction">
          <p className="text-white/55 leading-7">
            The <strong className="text-white/80">ZCS API</strong> is an S3-compatible HTTP API for programmatic file storage — create buckets, upload and download objects, generate presigned URLs, and track usage. Every operation is scoped to your tenant account using an API key.
          </p>
          <div className="grid grid-cols-3 gap-4 mt-6">
            {[
              { label: 'Buckets', desc: 'Logical containers for your objects' },
              { label: 'Objects', desc: 'Files stored inside buckets' },
              { label: 'Presigned URLs', desc: 'Temporary direct-access links' },
            ].map(({ label, desc }) => (
              <div key={label} className="bg-white/3 border border-white/8 rounded-xl p-4">
                <div className="font-semibold text-white/80 text-sm mb-1">{label}</div>
                <div className="text-xs text-white/35">{desc}</div>
              </div>
            ))}
          </div>
        </Section>

        {/* ─────────────── BASE URL ──────────────────────────────────────── */}
        <Section id="base-url" title="Base URL">
          <p className="text-white/55 text-sm mb-4">
            All API requests are made to the following base URL. Append the endpoint path after it.
          </p>
          <div className="flex items-center gap-3 bg-[#0d0d0d] border border-white/10 rounded-xl px-5 py-4">
            <span className="text-white/20 text-xs uppercase tracking-widest font-semibold">Base</span>
            <code className="font-mono text-blue-300 text-sm flex-1">{BASE}</code>
            <CopyBtn text={BASE} />
          </div>
          <Callout type="info">
            The API runs on HTTPS. All requests must use <code className="text-blue-300">https://</code>.
            HTTP requests will be redirected or rejected.
          </Callout>
        </Section>

        {/* ─────────────── AUTHENTICATION ────────────────────────────────── */}
        <Section id="authentication" title="Authentication">
          <p className="text-white/55 text-sm leading-6">
            The API uses two authentication mechanisms depending on the route:
          </p>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="bg-purple-500/8 border border-purple-500/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span>🔑</span>
                <span className="text-purple-300 font-semibold text-sm">API Key</span>
              </div>
              <p className="text-xs text-white/40 leading-5">
                Used for all storage operations (buckets, objects, presigned URLs, search). Pass via the <code className="text-purple-200">X-API-Key</code> header. Keys are scoped to your tenant and have read/write/delete permissions.
              </p>
            </div>
            <div className="bg-blue-500/8 border border-blue-500/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span>🪪</span>
                <span className="text-blue-300 font-semibold text-sm">JWT Bearer Token</span>
              </div>
              <p className="text-xs text-white/40 leading-5">
                Used for account management, usage stats, and billing. Obtained by calling <code className="text-blue-200">POST /api/auth/login</code>. Pass via the <code className="text-blue-200">Authorization: Bearer &lt;token&gt;</code> header.
              </p>
            </div>
          </div>

          <SubSection id="api-keys-intro" title="What are API Keys">
            <p className="text-sm text-white/50 leading-6">
              API keys are long-lived credentials in the format <code className="text-purple-300 bg-white/5 px-1.5 py-0.5 rounded">sk_live_xxxxxxxxxxxxxxxx</code>. Each key is associated with your tenant, can have scoped permissions (<code className="text-white/60">read</code>, <code className="text-white/60">write</code>, <code className="text-white/60">delete</code>), and can be revoked independently without affecting other keys. The full key is only shown once at creation time.
            </p>
            <Callout type="warn">
              Treat API keys like passwords. Never commit them to git or expose them in client-side code. Use environment variables.
            </Callout>
          </SubSection>

          <SubSection id="generate-key" title="Generate an API Key">
            <p className="text-sm text-white/50 mb-4">Follow these steps to create a new API key from the dashboard:</p>
            <Step n="1" title="Log in to your account">
              Go to the dashboard and sign in with your email and password.
              <Code lang="curl">{`curl -X POST ${BASE}/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"you@example.com","password":"yourpassword"}'`}</Code>
              <p className="text-xs text-white/35 mt-2">Save the <code className="text-blue-300">token</code> from the response — you need it to create an API key.</p>
            </Step>
            <Step n="2" title='Navigate to API Keys in the dashboard'>
              In the left sidebar, click <strong className="text-white/70">API Keys</strong>. You will see all your existing keys and a button to create a new one.
            </Step>
            <Step n="3" title="Create a key via the UI or API">
              <p className="text-sm text-white/50 mb-2">In the dashboard, click <strong className="text-white/70">Create New Key</strong>, give it a name, choose permissions, and click Create.</p>
              <p className="text-sm text-white/50 mb-2">Or create one programmatically:</p>
              <Code lang="curl">{`curl -X POST ${BASE}/api/keys \\
  -H "Authorization: Bearer <your_jwt_token>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Production key",
    "permissions": ["read","write","delete"]
  }'`}</Code>
              <Code lang="response">{`{
  "key": {
    "id": "clx...",
    "name": "Production key",
    "key": "sk_live_a1b2c3d4e5f6...",   ← copy this now, shown once
    "keyPrefix": "sk_live_a1b2",
    "permissions": ["read","write","delete"],
    "status": "active",
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
}`}</Code>
              <Callout type="danger">
                The full key is only shown <strong>once</strong>. Copy it immediately and store it securely. You cannot retrieve it again — only delete and recreate.
              </Callout>
            </Step>
            <Step n="4" title="Store your key securely">
              Save the key in an environment variable:
              <Code lang="bash">{`export ZCS_API_KEY="sk_live_a1b2c3d4e5f6..."`}</Code>
            </Step>
          </SubSection>

          <SubSection id="using-key" title="Using Your Key in Requests">
            <p className="text-sm text-white/50 mb-3">Pass the API key in the <code className="text-purple-300">X-API-Key</code> header on every storage request:</p>
            <Code lang="curl">{`curl ${BASE}/api/storage/buckets \\
  -H "X-API-Key: sk_live_your_key_here"`}</Code>
            <p className="text-sm text-white/50 mt-4 mb-3">For JWT-protected routes (usage, billing), use the <code className="text-blue-300">Authorization</code> header:</p>
            <Code lang="curl">{`curl ${BASE}/api/billing/estimate \\
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..."`}</Code>
          </SubSection>
        </Section>

        {/* ─────────────── RATE LIMITS ───────────────────────────────────── */}
        <Section id="rate-limits" title="Rate Limits">
          <p className="text-sm text-white/50 leading-6 mb-4">
            Each tenant has a configurable rate limit (default: <strong className="text-white/70">1,000 requests per 60 seconds</strong>). Limits are tracked in Redis per tenant. When you exceed the limit you receive a <code className="text-red-300">429 Too Many Requests</code> response.
          </p>
          <p className="text-sm text-white/50 mb-3">Every response includes rate limit headers:</p>
          <div className="rounded-xl border border-white/8 overflow-hidden">
            <table className="w-full text-sm">
              <tbody>
                {[
                  ['X-RateLimit-Limit', 'Your configured max requests per window'],
                  ['X-RateLimit-Remaining', 'Requests remaining in the current window'],
                  ['X-RateLimit-Reset', 'Unix timestamp when the window resets'],
                ].map(([h, d]) => (
                  <tr key={h} className="border-b border-white/5 last:border-0">
                    <td className="px-4 py-2.5 font-mono text-xs text-purple-300 w-56">{h}</td>
                    <td className="px-4 py-2.5 text-xs text-white/40">{d}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Callout type="tip">
            Your plan tier determines your default rate limit. Admins can raise limits per-tenant from the Rate Limits panel.
          </Callout>
        </Section>

        {/* ─────────────── ERRORS ────────────────────────────────────────── */}
        <Section id="errors" title="Errors">
          <p className="text-sm text-white/50 mb-4">All errors return JSON with a consistent shape:</p>
          <Code lang="json">{`{
  "statusCode": 404,
  "error": "Not Found",
  "message": "Object not found"
}`}</Code>
          <div className="mt-4 rounded-xl border border-white/8 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-white/3 border-b border-white/8">
                  <th className="px-4 py-2 text-left text-xs text-white/30 font-medium w-20">Code</th>
                  <th className="px-4 py-2 text-left text-xs text-white/30 font-medium">Meaning</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['400', 'Bad Request — missing or invalid parameters'],
                  ['401', 'Unauthorized — missing or invalid credentials'],
                  ['403', 'Forbidden — account suspended or insufficient permissions'],
                  ['404', 'Not Found — bucket, object, or invoice does not exist'],
                  ['409', 'Conflict — resource already exists (e.g. duplicate bucket name)'],
                  ['422', 'Validation Error — body failed validation'],
                  ['429', 'Too Many Requests — rate limit exceeded'],
                  ['500', 'Internal Server Error — something went wrong on our end'],
                ].map(([code, msg]) => (
                  <tr key={code} className="border-b border-white/5 last:border-0">
                    <td className="px-4 py-2.5 font-mono text-xs text-red-300">{code}</td>
                    <td className="px-4 py-2.5 text-xs text-white/45">{msg}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* ─────────────── BUCKETS ───────────────────────────────────────── */}
        <Section id="buckets" title="Buckets">
          <p className="text-sm text-white/50">
            Buckets are top-level containers for your objects — similar to folders or S3 buckets. Each bucket name must be unique within your tenant.
          </p>

          <SubSection id="list-buckets" title="List Buckets">
            <Endpoint method="GET" path="/api/storage/buckets" auth="API Key" summary="Return all buckets for the authenticated tenant, newest first. Each bucket includes an object count." />
            <Code lang="curl">{`curl ${BASE}/api/storage/buckets \\
  -H "X-API-Key: sk_live_your_key"`}</Code>
            <Code lang="response">{`{
  "buckets": [
    {
      "id": "clx...",
      "name": "my-assets",
      "region": "us-east-1",
      "isPublic": false,
      "createdAt": "2025-01-15T10:00:00.000Z",
      "_count": { "objects": 42 }
    }
  ]
}`}</Code>
          </SubSection>

          <SubSection id="create-bucket" title="Create Bucket">
            <Endpoint method="POST" path="/api/storage/buckets" auth="API Key" summary="Create a new bucket. Names must be 3–63 lowercase alphanumeric characters; hyphens allowed." />
            <ParamTable title="Request body" rows={[
              ['name',     'string', '3–63 chars, lowercase alphanumeric and hyphens', true],
              ['isPublic', 'boolean','Whether objects are publicly accessible (default: false)', false],
              ['region',   'string', 'Storage region (default: us-east-1)', false],
            ]} />
            <Code lang="curl">{`curl -X POST ${BASE}/api/storage/buckets \\
  -H "X-API-Key: sk_live_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "my-assets",
    "isPublic": false,
    "region": "us-east-1"
  }'`}</Code>
            <Code lang="response">{`{
  "bucket": {
    "id": "clx...",
    "name": "my-assets",
    "region": "us-east-1",
    "isPublic": false,
    "createdAt": "2025-01-15T10:00:00.000Z"
  }
}`}</Code>
          </SubSection>

          <SubSection id="delete-bucket" title="Delete Bucket">
            <Endpoint method="DELETE" path="/api/storage/buckets/:name" auth="API Key" summary="Permanently delete a bucket. The bucket must be empty — delete all objects first." />
            <ParamTable title="Path params" rows={[
              ['name', 'string', 'The bucket name', true],
            ]} />
            <Code lang="curl">{`curl -X DELETE ${BASE}/api/storage/buckets/my-assets \\
  -H "X-API-Key: sk_live_your_key"`}</Code>
            <p className="text-xs text-white/35 mt-2">Returns <code className="text-white/50">204 No Content</code> on success.</p>
            <Callout type="danger">This action is irreversible. Ensure the bucket is empty before deleting.</Callout>
          </SubSection>
        </Section>

        {/* ─────────────── OBJECTS ───────────────────────────────────────── */}
        <Section id="objects" title="Objects">
          <p className="text-sm text-white/50">
            Objects are the files stored inside buckets. Keys act like file paths — you can use slashes to simulate folders (e.g. <code className="text-white/60">images/2025/photo.jpg</code>).
          </p>

          <SubSection id="list-objects" title="List Objects">
            <Endpoint method="GET" path="/api/storage/buckets/:name/objects" auth="API Key" summary="List objects in a bucket with optional prefix filtering and pagination." />
            <ParamTable title="Path params" rows={[['name','string','Bucket name',true]]} />
            <ParamTable title="Query params" rows={[
              ['prefix','string','Filter keys by prefix (default: empty string)',false],
              ['limit', 'number','Max results to return, up to 1000 (default: 100)',false],
              ['offset','number','Pagination offset (default: 0)',false],
            ]} />
            <Code lang="curl">{`curl "${BASE}/api/storage/buckets/my-assets/objects?prefix=images/&limit=50" \\
  -H "X-API-Key: sk_live_your_key"`}</Code>
            <Code lang="response">{`{
  "objects": [
    {
      "id": "clx...",
      "key": "images/2025/photo.jpg",
      "size": "204800",
      "contentType": "image/jpeg",
      "createdAt": "2025-01-20T08:30:00.000Z"
    }
  ],
  "total": 1,
  "bucket": { "id": "clx...", "name": "my-assets" }
}`}</Code>
          </SubSection>

          <SubSection id="upload-text" title="Upload Text / JSON">
            <Endpoint method="POST" path="/api/storage/buckets/:name/upload" auth="API Key" summary="Upload a text string or JSON object. Content is serialised and stored as bytes. Use this for configs, logs, and structured data." />
            <ParamTable title="Path params" rows={[['name','string','Bucket name',true]]} />
            <ParamTable title="Request body" rows={[
              ['key',        'string','Object key / path (e.g. configs/app.json)',true],
              ['content',    'any',   'String or JSON object to store',true],
              ['contentType','string','MIME type (default: text/plain)',false],
            ]} />
            <Code lang="curl">{`# Upload a plain text file
curl -X POST ${BASE}/api/storage/buckets/my-assets/upload \\
  -H "X-API-Key: sk_live_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "key": "readme.txt",
    "content": "Hello, world!",
    "contentType": "text/plain"
  }'

# Upload a JSON config
curl -X POST ${BASE}/api/storage/buckets/my-assets/upload \\
  -H "X-API-Key: sk_live_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "key": "configs/app.json",
    "content": {"theme":"dark","version":2},
    "contentType": "application/json"
  }'`}</Code>
            <Code lang="response">{`{
  "object": {
    "id": "clx...",
    "key": "readme.txt",
    "size": "13",
    "contentType": "text/plain"
  },
  "bytes": 13,
  "cost": 0.000000000295
}`}</Code>
          </SubSection>

          <SubSection id="upload-file" title="Upload Binary File">
            <Endpoint method="POST" path="/api/storage/buckets/:name/upload-file" auth="API Key" summary="Multipart upload for binary files — images, videos, PDFs, archives. Sends the file as form-data." />
            <ParamTable title="Path params" rows={[['name','string','Bucket name',true]]} />
            <ParamTable title="Query params" rows={[
              ['key','string','Object key. Falls back to the original filename if omitted.',false],
            ]} />
            <Code lang="curl">{`# Upload an image
curl -X POST "${BASE}/api/storage/buckets/my-assets/upload-file?key=photos/hero.jpg" \\
  -H "X-API-Key: sk_live_your_key" \\
  -F "file=@/path/to/hero.jpg"

# Upload a PDF (key from filename)
curl -X POST "${BASE}/api/storage/buckets/my-assets/upload-file" \\
  -H "X-API-Key: sk_live_your_key" \\
  -F "file=@report.pdf"

# Upload a zip archive
curl -X POST "${BASE}/api/storage/buckets/my-assets/upload-file?key=archives/build.zip" \\
  -H "X-API-Key: sk_live_your_key" \\
  -F "file=@build.zip"`}</Code>
            <Code lang="response">{`{
  "object": {
    "id": "clx...",
    "key": "photos/hero.jpg",
    "size": "512000",
    "contentType": "image/jpeg"
  },
  "bytes": 512000,
  "filename": "hero.jpg",
  "cost": 0.0000000118
}`}</Code>
          </SubSection>

          <SubSection id="download" title="Download Object">
            <Endpoint method="GET" path="/api/storage/buckets/:name/objects/*" auth="API Key" summary="Download an object's raw bytes. The response Content-Type matches what was set at upload time." />
            <ParamTable title="Path params" rows={[
              ['name','string','Bucket name',true],
              ['*',   'string','Full object key (supports slashes)',true],
            ]} />
            <Code lang="curl">{`# Download to stdout
curl "${BASE}/api/storage/buckets/my-assets/objects/readme.txt" \\
  -H "X-API-Key: sk_live_your_key"

# Save to a file
curl "${BASE}/api/storage/buckets/my-assets/objects/photos/hero.jpg" \\
  -H "X-API-Key: sk_live_your_key" \\
  -o hero.jpg

# Download a nested path
curl "${BASE}/api/storage/buckets/my-assets/objects/configs/app.json" \\
  -H "X-API-Key: sk_live_your_key"`}</Code>
            <p className="text-xs text-white/35 mt-2">Response is the raw file bytes with the correct <code className="text-white/50">Content-Type</code> header.</p>
          </SubSection>

          <SubSection id="delete-object" title="Delete Object">
            <Endpoint method="DELETE" path="/api/storage/buckets/:name/objects/*" auth="API Key" summary="Permanently delete a single object from a bucket." />
            <ParamTable title="Path params" rows={[
              ['name','string','Bucket name',true],
              ['*',   'string','Full object key',true],
            ]} />
            <Code lang="curl">{`curl -X DELETE "${BASE}/api/storage/buckets/my-assets/objects/readme.txt" \\
  -H "X-API-Key: sk_live_your_key"

# Nested path
curl -X DELETE "${BASE}/api/storage/buckets/my-assets/objects/photos/hero.jpg" \\
  -H "X-API-Key: sk_live_your_key"`}</Code>
            <p className="text-xs text-white/35 mt-2">Returns <code className="text-white/50">204 No Content</code> on success.</p>
          </SubSection>
        </Section>

        {/* ─────────────── PRESIGNED URLS ────────────────────────────────── */}
        <Section id="presigned" title="Presigned URLs">
          <p className="text-sm text-white/50 leading-6">
            Presigned URLs let clients upload or download files <strong className="text-white/70">directly to object storage</strong>, bypassing the API server. This is the recommended approach for large files since it avoids double-transferring data through your backend.
          </p>
          <div className="mt-4 bg-white/3 border border-white/8 rounded-xl p-4 text-xs text-white/40 leading-6">
            <strong className="text-white/60">Flow for presigned upload:</strong>
            <span className="ml-2">Your server calls <code className="text-purple-300">presign/upload</code> →</span>
            <span className="ml-2">client uploads directly to the returned URL →</span>
            <span className="ml-2">your server calls <code className="text-purple-300">objects/confirm</code> to register the object in the database.</span>
          </div>

          <SubSection id="presign-upload" title="Generate Upload URL">
            <Endpoint method="POST" path="/api/storage/presign/upload" auth="API Key" summary="Returns a presigned PUT URL valid for the specified duration. The client sends the file directly to this URL." />
            <ParamTable title="Request body" rows={[
              ['bucketName', 'string','Target bucket name',true],
              ['key',        'string','Object key to create',true],
              ['contentType','string','MIME type of the file (default: application/octet-stream)',false],
              ['expiresIn',  'number','URL lifetime in seconds (default: 3600)',false],
            ]} />
            <Code lang="curl">{`# Step 1 — get presigned URL from your server
curl -X POST ${BASE}/api/storage/presign/upload \\
  -H "X-API-Key: sk_live_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "bucketName": "my-assets",
    "key": "uploads/video.mp4",
    "contentType": "video/mp4",
    "expiresIn": 3600
  }'`}</Code>
            <Code lang="response">{`{
  "url": "https://storage.example.com/zcs/...",
  "storageKey": "tenant123/bucket456/uploads/video.mp4",
  "expiresIn": 3600,
  "expiresAt": "2025-01-15T11:00:00.000Z"
}`}</Code>
            <Code lang="curl">{`# Step 2 — client uploads directly to the presigned URL
curl -X PUT "<url_from_above>" \\
  -H "Content-Type: video/mp4" \\
  --data-binary @video.mp4`}</Code>
          </SubSection>

          <SubSection id="presign-download" title="Generate Download URL">
            <Endpoint method="POST" path="/api/storage/presign/download" auth="API Key" summary="Returns a temporary public URL for downloading a specific object without credentials." />
            <ParamTable title="Request body" rows={[
              ['bucketName','string','Bucket name',true],
              ['key',       'string','Object key',true],
              ['expiresIn', 'number','URL lifetime in seconds (default: 3600)',false],
            ]} />
            <Code lang="curl">{`curl -X POST ${BASE}/api/storage/presign/download \\
  -H "X-API-Key: sk_live_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "bucketName": "my-assets",
    "key": "photos/hero.jpg",
    "expiresIn": 900
  }'`}</Code>
            <Code lang="response">{`{
  "url": "https://storage.example.com/zcs/...?X-Amz-Expires=900&...",
  "expiresIn": 900
}`}</Code>
          </SubSection>

          <SubSection id="confirm-upload" title="Confirm Upload">
            <Endpoint method="POST" path="/api/storage/objects/confirm" auth="API Key" summary="After a client finishes a presigned upload, call this to register the object in the database. Without this step the object exists in storage but is invisible to List and Download APIs." />
            <ParamTable title="Request body" rows={[
              ['bucketName', 'string','Bucket name',true],
              ['key',        'string','Object key',true],
              ['storageKey', 'string','Value returned by presign/upload',true],
              ['size',       'number','File size in bytes',false],
              ['contentType','string','MIME type',false],
              ['metadata',   'object','Optional arbitrary metadata',false],
            ]} />
            <Code lang="curl">{`# Step 3 — register the object in the database
curl -X POST ${BASE}/api/storage/objects/confirm \\
  -H "X-API-Key: sk_live_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "bucketName": "my-assets",
    "key": "uploads/video.mp4",
    "storageKey": "tenant123/bucket456/uploads/video.mp4",
    "size": 104857600,
    "contentType": "video/mp4"
  }'`}</Code>
            <Code lang="response">{`{
  "object": {
    "id": "clx...",
    "key": "uploads/video.mp4",
    "size": "104857600",
    "contentType": "video/mp4"
  }
}`}</Code>
          </SubSection>
        </Section>

        {/* ─────────────── SEARCH ────────────────────────────────────────── */}
        <Section id="search" title="Search">
          <Endpoint method="GET" path="/api/storage/search" auth="API Key" summary="Case-insensitive substring search across all bucket names and object keys. Returns up to 5 buckets and 8 objects." />
          <ParamTable title="Query params" rows={[
            ['q','string','Search term (required)',true],
          ]} />
          <Code lang="curl">{`curl "${BASE}/api/storage/search?q=invoice" \\
  -H "X-API-Key: sk_live_your_key"

curl "${BASE}/api/storage/search?q=2025/report" \\
  -H "X-API-Key: sk_live_your_key"`}</Code>
          <Code lang="response">{`{
  "buckets": [
    { "id": "clx...", "name": "invoices-2025", "region": "us-east-1" }
  ],
  "objects": [
    {
      "id": "clx...",
      "key": "invoices/2025/january.pdf",
      "size": "98304",
      "contentType": "application/pdf",
      "bucket": { "name": "my-assets" }
    }
  ]
}`}</Code>
        </Section>

        {/* ─────────────── USAGE & BILLING ───────────────────────────────── */}
        <Section id="usage" title="Usage & Billing">
          <p className="text-sm text-white/50">
            These endpoints require a <strong className="text-white/70">JWT Bearer token</strong> obtained from <code className="text-blue-300">POST /api/auth/login</code>.
          </p>

          <SubSection id="usage-summary" title="Usage Summary">
            <Endpoint method="GET" path="/api/usage/summary" auth="JWT" summary="Current month totals: storage used, bytes uploaded and downloaded, API request count, and object count. Cached for 60 seconds." />
            <Code lang="curl">{`curl ${BASE}/api/usage/summary \\
  -H "Authorization: Bearer <your_jwt_token>"`}</Code>
            <Code lang="response">{`{
  "period": "2025-01",
  "storageBytes": "1073741824",
  "uploadBytes": "2147483648",
  "downloadBytes": "536870912",
  "requestCount": 4821,
  "objectCount": 237
}`}</Code>
          </SubSection>

          <SubSection id="usage-history" title="Usage History">
            <Endpoint method="GET" path="/api/usage/history" auth="JWT" summary="Historical monthly usage aggregates from the database." />
            <ParamTable title="Query params" rows={[
              ['months','number','Number of past months to return (default: 6)',false],
            ]} />
            <Code lang="curl">{`curl "${BASE}/api/usage/history?months=12" \\
  -H "Authorization: Bearer <your_jwt_token>"`}</Code>
            <Code lang="response">{`{
  "history": [
    {
      "period": "2025-01",
      "storageBytes": "1073741824",
      "uploadBytes": "2147483648",
      "downloadBytes": "536870912",
      "requestCount": "4821",
      "objectCount": "237"
    }
  ]
}`}</Code>
          </SubSection>

          <SubSection id="cost-estimate" title="Cost Estimate">
            <Endpoint method="GET" path="/api/billing/estimate" auth="JWT" summary="Current month's running cost estimate based on live usage. Free tier deducted automatically. Cached for 2 minutes." />
            <Code lang="curl">{`curl ${BASE}/api/billing/estimate \\
  -H "Authorization: Bearer <your_jwt_token>"`}</Code>
            <Code lang="response">{`{
  "period": "2025-01",
  "usage": {
    "storageBytes": "1073741824",
    "downloadBytes": "536870912",
    "requestCount": 4821
  },
  "costs": {
    "storageCost": 0.0,
    "downloadCost": 0.0,
    "requestCost": 0.0,
    "total": 0.00
  },
  "pricing": {
    "storage_gb": 50,
    "upload_gb": 30,
    "download_gb": 20,
    "requests_per_1k": 500
  }
}`}</Code>
            <Callout type="tip">
              Free tier: 5 GB storage, 1 GB egress, 10,000 requests per month are included at no charge.
            </Callout>
          </SubSection>

          <SubSection id="invoices" title="Invoices">
            <Endpoint method="GET" path="/api/billing/invoices" auth="JWT" summary="List all invoices for your account, newest first." />
            <Code lang="curl">{`curl ${BASE}/api/billing/invoices \\
  -H "Authorization: Bearer <your_jwt_token>"`}</Code>
            <Code lang="response">{`{
  "invoices": [
    {
      "id": "clx...",
      "period": "2024-12",
      "status": "paid",
      "subtotal": 1.45,
      "total": 1.45,
      "paidAt": "2025-01-01T00:00:00.000Z",
      "createdAt": "2024-12-31T23:59:00.000Z"
    }
  ]
}`}</Code>

            <div className="mt-6">
              <Endpoint method="GET" path="/api/billing/invoices/:id" auth="JWT" summary="Fetch a single invoice by its ID." />
              <Code lang="curl">{`curl ${BASE}/api/billing/invoices/clx_abc123 \\
  -H "Authorization: Bearer <your_jwt_token>"`}</Code>
            </div>
          </SubSection>
        </Section>

      </div>
    </div>
  );
}
