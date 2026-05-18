'use client';

import { useState, useMemo } from 'react';

// ── Real endpoint data from the actual backend routes ───────────────────────

const AUTH = 'none';
const JWT = 'JWT Bearer';
const APIKEY = 'API Key';
const ADMIN = 'Admin JWT';

const ENDPOINTS = [
  // Auth
  {
    group: 'Auth',
    method: 'POST', path: '/api/auth/register', auth: AUTH,
    summary: 'Register a new tenant account',
    body: { name: 'string (required)', email: 'string (required)', password: 'string (required)' },
    response: { token: 'string', tenant: '{ id, name, email, role, plan }' },
    curl: `curl -X POST https://yourapi.com/api/auth/register \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Acme Inc","email":"hello@acme.com","password":"secret"}'`,
  },
  {
    group: 'Auth',
    method: 'POST', path: '/api/auth/login', auth: AUTH,
    summary: 'Login as tenant or admin — returns a JWT token',
    body: { email: 'string (required)', password: 'string (required)' },
    response: { token: 'string', tenant: '{ id, name, email, role, plan }' },
    curl: `curl -X POST https://yourapi.com/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"hello@acme.com","password":"secret"}'`,
  },
  {
    group: 'Auth',
    method: 'GET', path: '/api/auth/me', auth: JWT,
    summary: 'Return the current authenticated tenant profile',
    response: { tenant: '{ id, name, email, role, plan, status, createdAt }' },
    curl: `curl https://yourapi.com/api/auth/me \\
  -H "Authorization: Bearer <token>"`,
  },
  {
    group: 'Auth',
    method: 'PATCH', path: '/api/auth/me', auth: JWT,
    summary: 'Update name, email, or password',
    body: { name: 'string (optional)', email: 'string (optional)', currentPassword: 'required if changing password', newPassword: 'string (optional)' },
    response: { tenant: '{ id, name, email, role, plan }' },
    curl: `curl -X PATCH https://yourapi.com/api/auth/me \\
  -H "Authorization: Bearer <token>" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"New Name"}'`,
  },

  // Buckets
  {
    group: 'Buckets',
    method: 'GET', path: '/api/storage/buckets', auth: APIKEY,
    summary: 'List all buckets for the authenticated tenant',
    response: { buckets: '[{ id, name, region, isPublic, createdAt, _count: { objects } }]' },
    curl: `curl https://yourapi.com/api/storage/buckets \\
  -H "X-API-Key: sk_live_..."`,
  },
  {
    group: 'Buckets',
    method: 'POST', path: '/api/storage/buckets', auth: APIKEY,
    summary: 'Create a new bucket. Name must be 3–63 lowercase alphanumeric characters or hyphens.',
    body: { name: 'string (required)', isPublic: 'boolean (default: false)', region: 'string (default: us-east-1)' },
    response: { bucket: '{ id, name, region, isPublic, createdAt }' },
    curl: `curl -X POST https://yourapi.com/api/storage/buckets \\
  -H "X-API-Key: sk_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{"name":"my-bucket","region":"us-east-1"}'`,
  },
  {
    group: 'Buckets',
    method: 'DELETE', path: '/api/storage/buckets/:name', auth: APIKEY,
    summary: 'Delete a bucket. The bucket must be empty first.',
    params: { name: 'Bucket name' },
    response: '204 No Content',
    curl: `curl -X DELETE https://yourapi.com/api/storage/buckets/my-bucket \\
  -H "X-API-Key: sk_live_..."`,
  },

  // Objects
  {
    group: 'Objects',
    method: 'GET', path: '/api/storage/buckets/:name/objects', auth: APIKEY,
    summary: 'List objects in a bucket with optional prefix filtering and pagination',
    params: { name: 'Bucket name' },
    query: { prefix: 'Filter by key prefix (default: "")', limit: 'Max results (default: 100)', offset: 'Pagination offset (default: 0)' },
    response: { objects: '[{ id, key, size, contentType, createdAt }]', total: 'number', bucket: 'object' },
    curl: `curl "https://yourapi.com/api/storage/buckets/my-bucket/objects?prefix=images/&limit=50" \\
  -H "X-API-Key: sk_live_..."`,
  },
  {
    group: 'Objects',
    method: 'POST', path: '/api/storage/buckets/:name/upload', auth: APIKEY,
    summary: 'Upload text or JSON content directly. For binary files use upload-file.',
    params: { name: 'Bucket name' },
    body: { key: 'string (required) — object key / path', content: 'string or object (required)', contentType: 'string (default: text/plain)' },
    response: { object: '{ id, key, size, contentType }', bytes: 'number', cost: 'estimated cost in $' },
    curl: `curl -X POST https://yourapi.com/api/storage/buckets/my-bucket/upload \\
  -H "X-API-Key: sk_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{"key":"hello.txt","content":"Hello, world!","contentType":"text/plain"}'`,
  },
  {
    group: 'Objects',
    method: 'POST', path: '/api/storage/buckets/:name/upload-file', auth: APIKEY,
    summary: 'Multipart file upload for binary files (images, PDFs, archives, etc.)',
    params: { name: 'Bucket name' },
    query: { key: 'Object key (falls back to filename if omitted)' },
    body: 'multipart/form-data with file field',
    response: { object: '{ id, key, size, contentType }', bytes: 'number', filename: 'string', cost: 'estimated cost in $' },
    curl: `curl -X POST "https://yourapi.com/api/storage/buckets/my-bucket/upload-file?key=photo.jpg" \\
  -H "X-API-Key: sk_live_..." \\
  -F "file=@/path/to/photo.jpg"`,
  },
  {
    group: 'Objects',
    method: 'GET', path: '/api/storage/buckets/:name/objects/*', auth: APIKEY,
    summary: 'Download an object. Returns raw bytes with the stored Content-Type.',
    params: { name: 'Bucket name', '*': 'Full object key (path)' },
    response: 'Raw file bytes with Content-Type header',
    curl: `curl "https://yourapi.com/api/storage/buckets/my-bucket/objects/images/photo.jpg" \\
  -H "X-API-Key: sk_live_..." \\
  -o photo.jpg`,
  },
  {
    group: 'Objects',
    method: 'DELETE', path: '/api/storage/buckets/:name/objects/*', auth: APIKEY,
    summary: 'Permanently delete an object from a bucket',
    params: { name: 'Bucket name', '*': 'Full object key' },
    response: '204 No Content',
    curl: `curl -X DELETE "https://yourapi.com/api/storage/buckets/my-bucket/objects/old-file.txt" \\
  -H "X-API-Key: sk_live_..."`,
  },

  // Presigned URLs
  {
    group: 'Presigned URLs',
    method: 'POST', path: '/api/storage/presign/upload', auth: APIKEY,
    summary: 'Generate a presigned URL for direct client-to-storage upload (bypasses the API server)',
    body: { bucketName: 'string (required)', key: 'string (required)', contentType: 'string (default: application/octet-stream)', expiresIn: 'seconds (default: 3600)' },
    response: { url: 'Presigned PUT URL', storageKey: 'Internal storage key', expiresIn: 'number', expiresAt: 'ISO timestamp' },
    curl: `curl -X POST https://yourapi.com/api/storage/presign/upload \\
  -H "X-API-Key: sk_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{"bucketName":"my-bucket","key":"upload.bin","expiresIn":3600}'`,
  },
  {
    group: 'Presigned URLs',
    method: 'POST', path: '/api/storage/presign/download', auth: APIKEY,
    summary: 'Generate a presigned URL for temporary public download access',
    body: { bucketName: 'string (required)', key: 'string (required)', expiresIn: 'seconds (default: 3600)' },
    response: { url: 'Presigned GET URL', expiresIn: 'number' },
    curl: `curl -X POST https://yourapi.com/api/storage/presign/download \\
  -H "X-API-Key: sk_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{"bucketName":"my-bucket","key":"report.pdf","expiresIn":900}'`,
  },
  {
    group: 'Presigned URLs',
    method: 'POST', path: '/api/storage/objects/confirm', auth: APIKEY,
    summary: 'Register an object in the database after a direct presigned upload completes',
    body: { bucketName: 'string', key: 'string', storageKey: 'from presign/upload response', size: 'bytes', contentType: 'string', metadata: 'object (optional)' },
    response: { object: '{ id, key, size, contentType }' },
    curl: `curl -X POST https://yourapi.com/api/storage/objects/confirm \\
  -H "X-API-Key: sk_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{"bucketName":"my-bucket","key":"upload.bin","storageKey":"...","size":204800}'`,
  },

  // Search
  {
    group: 'Search',
    method: 'GET', path: '/api/storage/search', auth: APIKEY,
    summary: 'Search across all buckets and objects by name/key (case-insensitive substring)',
    query: { q: 'Search term (required, non-empty)' },
    response: { buckets: '[...up to 5]', objects: '[...up to 8, includes bucket.name]' },
    curl: `curl "https://yourapi.com/api/storage/search?q=invoice" \\
  -H "X-API-Key: sk_live_..."`,
  },

  // Usage & Metering
  {
    group: 'Usage',
    method: 'GET', path: '/api/demo/usage', auth: APIKEY,
    summary: 'Full usage snapshot for the current month — storage, uploads, egress, request costs, recent events',
    response: { period: 'YYYY-MM', storageBytes: 'string', uploadBytes: 'string', downloadBytes: 'string', requestCount: 'number', objectCount: 'number', costs: '{ storage, egress, requests, total }', recentEvents: '[...]' },
    curl: `curl https://yourapi.com/api/demo/usage \\
  -H "X-API-Key: sk_live_..."`,
  },
  {
    group: 'Usage',
    method: 'GET', path: '/api/usage/summary', auth: JWT,
    summary: 'Current month usage totals — storage bytes, upload/download bytes, request count, object count',
    response: { period: 'YYYY-MM', storageBytes: 'string', uploadBytes: 'string', downloadBytes: 'string', requestCount: 'number', objectCount: 'number' },
    curl: `curl https://yourapi.com/api/usage/summary \\
  -H "Authorization: Bearer <token>"`,
  },
  {
    group: 'Usage',
    method: 'GET', path: '/api/usage/history', auth: JWT,
    summary: 'Historical monthly usage aggregates (from UsageAggregate table)',
    query: { months: 'Number of past months to return (default: 6)' },
    response: { history: '[{ period, storageBytes, uploadBytes, downloadBytes, requestCount, objectCount }]' },
    curl: `curl "https://yourapi.com/api/usage/history?months=12" \\
  -H "Authorization: Bearer <token>"`,
  },
  {
    group: 'Usage',
    method: 'GET', path: '/api/usage/events', auth: JWT,
    summary: 'Paginated list of raw usage events for the tenant',
    query: { limit: 'Max results (default: 20, max: 100)', offset: 'Pagination offset (default: 0)' },
    response: { events: '[{ id, eventType, bytes, objectKey, bucketName, createdAt }]' },
    curl: `curl "https://yourapi.com/api/usage/events?limit=50" \\
  -H "Authorization: Bearer <token>"`,
  },

  // Billing
  {
    group: 'Billing',
    method: 'GET', path: '/api/billing/invoices', auth: JWT,
    summary: 'List all invoices for the tenant, newest first',
    response: { invoices: '[{ id, period, status, subtotal, total, lineItems, dueAt, paidAt, createdAt }]' },
    curl: `curl https://yourapi.com/api/billing/invoices \\
  -H "Authorization: Bearer <token>"`,
  },
  {
    group: 'Billing',
    method: 'GET', path: '/api/billing/invoices/:id', auth: JWT,
    summary: 'Get a single invoice by ID',
    params: { id: 'Invoice ID' },
    response: { invoice: '{ id, period, status, subtotal, total, lineItems, dueAt, paidAt }' },
    curl: `curl https://yourapi.com/api/billing/invoices/clx... \\
  -H "Authorization: Bearer <token>"`,
  },
  {
    group: 'Billing',
    method: 'GET', path: '/api/billing/estimate', auth: JWT,
    summary: 'Current month cost estimate based on live usage data. Cached for 2 minutes.',
    response: { period: 'YYYY-MM', usage: '{ storageBytes, downloadBytes, requestCount }', costs: '{ storageCost, downloadCost, requestCost, total }', pricing: '{ storage_gb, download_gb, requests_per_1k }' },
    curl: `curl https://yourapi.com/api/billing/estimate \\
  -H "Authorization: Bearer <token>"`,
  },
];

const GROUPS = [...new Set(ENDPOINTS.map((e) => e.group))];

const METHOD_COLORS = {
  GET:    'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  POST:   'bg-blue-500/20 text-blue-400 border-blue-500/30',
  PATCH:  'bg-amber-500/20 text-amber-400 border-amber-500/30',
  PUT:    'bg-purple-500/20 text-purple-400 border-purple-500/30',
  DELETE: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const AUTH_COLORS = {
  [JWT]:    'text-blue-400',
  [APIKEY]: 'text-purple-400',
  [ADMIN]:  'text-red-400',
  [AUTH]:   'text-white/30',
};

// ── Components ──────────────────────────────────────────────────────────────

function MethodBadge({ method }) {
  return (
    <span className={`shrink-0 px-2 py-0.5 rounded border text-xs font-bold font-mono w-16 text-center ${METHOD_COLORS[method]}`}>
      {method}
    </span>
  );
}

function CodeBlock({ children }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <div className="relative group">
      <pre className="bg-black/40 border border-white/8 rounded-lg px-4 py-3 text-xs text-white/70 overflow-x-auto whitespace-pre font-mono leading-relaxed">
        {children}
      </pre>
      <button
        onClick={copy}
        className="absolute top-2 right-2 px-2 py-1 text-xs bg-white/10 hover:bg-white/20 text-white/50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
    </div>
  );
}

function ObjectTable({ data }) {
  if (typeof data === 'string') return <div className="text-xs text-white/50 font-mono">{data}</div>;
  return (
    <table className="w-full text-xs">
      <tbody>
        {Object.entries(data).map(([k, v]) => (
          <tr key={k} className="border-b border-white/5 last:border-0">
            <td className="py-1.5 pr-4 font-mono text-purple-300 w-48">{k}</td>
            <td className="py-1.5 text-white/50">{v}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function EndpointCard({ ep }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`border rounded-xl transition-colors ${open ? 'border-white/15 bg-white/3' : 'border-white/8 hover:border-white/12'}`}>
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <MethodBadge method={ep.method} />
        <span className="font-mono text-sm text-white/80 flex-1">{ep.path}</span>
        <span className={`text-xs shrink-0 ${AUTH_COLORS[ep.auth]}`}>{ep.auth}</span>
        <span className="text-white/20 text-xs ml-2">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-4 border-t border-white/8 pt-4">
          <p className="text-sm text-white/60">{ep.summary}</p>

          {ep.params && (
            <div>
              <div className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-2">Path Params</div>
              <ObjectTable data={ep.params} />
            </div>
          )}
          {ep.query && (
            <div>
              <div className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-2">Query Params</div>
              <ObjectTable data={ep.query} />
            </div>
          )}
          {ep.body && (
            <div>
              <div className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-2">Request Body</div>
              <ObjectTable data={ep.body} />
            </div>
          )}
          {ep.response && (
            <div>
              <div className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-2">Response</div>
              <ObjectTable data={ep.response} />
            </div>
          )}
          {ep.curl && (
            <div>
              <div className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-2">Example</div>
              <CodeBlock>{ep.curl}</CodeBlock>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Tabs content ─────────────────────────────────────────────────────────────

function ApiReference() {
  const [search, setSearch] = useState('');
  const [activeGroup, setActiveGroup] = useState('All');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return ENDPOINTS.filter((e) => {
      const matchGroup = activeGroup === 'All' || e.group === activeGroup;
      const matchSearch = !q || e.path.toLowerCase().includes(q) || e.summary.toLowerCase().includes(q) || e.method.toLowerCase().includes(q);
      return matchGroup && matchSearch;
    });
  }, [search, activeGroup]);

  const grouped = useMemo(() => {
    const map = {};
    for (const ep of filtered) {
      if (!map[ep.group]) map[ep.group] = [];
      map[ep.group].push(ep);
    }
    return map;
  }, [filtered]);

  return (
    <div className="space-y-6">
      {/* Auth legend */}
      <div className="flex flex-wrap gap-4 text-xs text-white/40">
        <span className="text-blue-400">● JWT Bearer</span>
        <span className="text-purple-400">● API Key</span>
        <span className="text-white/30">● No auth</span>
        <span className="ml-auto italic">Click an endpoint to expand details and see a curl example</span>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <input
          type="text"
          placeholder="Search endpoints…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-48 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500/50"
        />
        <div className="flex gap-1 bg-white/5 border border-white/8 rounded-lg p-1 flex-wrap">
          {['All', ...GROUPS].map((g) => (
            <button
              key={g}
              onClick={() => setActiveGroup(g)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${activeGroup === g ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70'}`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Endpoint groups */}
      {Object.entries(grouped).length === 0 ? (
        <div className="text-center py-12 text-white/30">No endpoints match your search</div>
      ) : (
        Object.entries(grouped).map(([group, eps]) => (
          <div key={group}>
            <h2 className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-3">{group}</h2>
            <div className="space-y-2">
              {eps.map((ep) => <EndpointCard key={ep.method + ep.path} ep={ep} />)}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function QuickStart() {
  return (
    <div className="space-y-8 max-w-2xl text-sm text-white/70">
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
        <div className="text-blue-300 font-semibold mb-1">Base URL</div>
        <code className="text-blue-200 font-mono">http://localhost:4000</code>
        <span className="text-white/30 ml-3">(or your deployed backend URL)</span>
      </div>

      <div>
        <h2 className="text-white font-semibold text-base mb-3">1 — Register an account</h2>
        <CodeBlock>{`curl -X POST http://localhost:4000/api/auth/register \\
  -H "Content-Type: application/json" \\
  -d '{"name":"My Company","email":"me@example.com","password":"strong-pass"}'`}</CodeBlock>
        <p className="mt-2 text-white/40">Returns a JWT token. Store it — you'll use it for dashboard API calls.</p>
      </div>

      <div>
        <h2 className="text-white font-semibold text-base mb-3">2 — Create an API key (from the dashboard)</h2>
        <p className="text-white/40">Log in to the dashboard at <code className="text-white/60">http://localhost:3000</code>, go to <strong className="text-white/60">API Keys</strong>, and create a key. All storage operations require an API key header:</p>
        <CodeBlock>{`X-API-Key: sk_live_your_key_here`}</CodeBlock>
      </div>

      <div>
        <h2 className="text-white font-semibold text-base mb-3">3 — Create a bucket</h2>
        <CodeBlock>{`curl -X POST http://localhost:4000/api/storage/buckets \\
  -H "X-API-Key: sk_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{"name":"my-assets","region":"us-east-1"}'`}</CodeBlock>
      </div>

      <div>
        <h2 className="text-white font-semibold text-base mb-3">4 — Upload a file</h2>
        <p className="mb-2 text-white/40">Binary file (multipart):</p>
        <CodeBlock>{`curl -X POST "http://localhost:4000/api/storage/buckets/my-assets/upload-file?key=logo.png" \\
  -H "X-API-Key: sk_live_..." \\
  -F "file=@logo.png"`}</CodeBlock>
        <p className="mt-3 mb-2 text-white/40">Text / JSON content:</p>
        <CodeBlock>{`curl -X POST http://localhost:4000/api/storage/buckets/my-assets/upload \\
  -H "X-API-Key: sk_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{"key":"config.json","content":{"theme":"dark"},"contentType":"application/json"}'`}</CodeBlock>
      </div>

      <div>
        <h2 className="text-white font-semibold text-base mb-3">5 — Download a file</h2>
        <CodeBlock>{`curl "http://localhost:4000/api/storage/buckets/my-assets/objects/logo.png" \\
  -H "X-API-Key: sk_live_..." \\
  -o logo.png`}</CodeBlock>
      </div>

      <div>
        <h2 className="text-white font-semibold text-base mb-3">6 — Presigned upload (direct client → storage)</h2>
        <p className="mb-2 text-white/40">Step 1: get a presigned URL from your server</p>
        <CodeBlock>{`curl -X POST http://localhost:4000/api/storage/presign/upload \\
  -H "X-API-Key: sk_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{"bucketName":"my-assets","key":"video.mp4","contentType":"video/mp4"}'`}</CodeBlock>
        <p className="mt-3 mb-2 text-white/40">Step 2: upload directly to the returned URL</p>
        <CodeBlock>{`curl -X PUT "<presigned_url>" \\
  -H "Content-Type: video/mp4" \\
  --data-binary @video.mp4`}</CodeBlock>
        <p className="mt-3 mb-2 text-white/40">Step 3: confirm the upload so it appears in the database</p>
        <CodeBlock>{`curl -X POST http://localhost:4000/api/storage/objects/confirm \\
  -H "X-API-Key: sk_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{"bucketName":"my-assets","key":"video.mp4","storageKey":"<from presign response>","size":10485760}'`}</CodeBlock>
      </div>

      <div>
        <h2 className="text-white font-semibold text-base mb-3">7 — Check usage and cost estimate</h2>
        <CodeBlock>{`curl http://localhost:4000/api/billing/estimate \\
  -H "Authorization: Bearer <jwt_token>"`}</CodeBlock>
        <p className="mt-2 text-white/40">Returns current-month storage, egress, and request costs. Cached for 2 min.</p>
      </div>
    </div>
  );
}

function AdminGuide() {
  const sections = [
    {
      title: 'Overview',
      content: 'The Overview page shows live platform-wide stats: total tenant count, bucket count, object count, and total storage used across all tenants. Numbers are fetched live from the database on each page load.',
    },
    {
      title: 'Tenants',
      content: 'Browse and search all registered tenants. You can change a tenant\'s plan (free/pro/enterprise) inline, or suspend/activate accounts. Plan changes are immediate and update both the database and the cached rate limit config in Redis.',
    },
    {
      title: 'Infrastructure',
      content: 'Live health checks for PostgreSQL, Redis, and object storage (MinIO/B2), alongside server CPU, memory, and heap metrics. The check runs on every page load; latency is measured in real time.',
    },
    {
      title: 'Pricing',
      content: 'Edit global pricing rules for Storage ($/GB), Egress ($/GB), and Requests ($/1k). Changes persist to the PricingRule table. You can also set per-tenant pricing overrides using the Overrides tab — search for a tenant and enter a custom rate object.',
    },
    {
      title: 'Rate Limits',
      content: 'Set a global default (requests/window) and apply it to all tenants or a specific plan. The Tenants tab shows live Redis counters per tenant with a usage bar. You can reset a tenant\'s counter, or expand a row to edit their individual limits. All changes invalidate the 5-minute Redis config cache immediately.',
    },
    {
      title: 'Abuse Detection',
      content: 'Computes abuse signals from real data — Redis rate limit counters (live) and UsageEvent 24-hour aggregates (from the database). Signals: rate limit critical (≥95%), rate limit high (≥75%), upload spike (>10 GB/24h), egress spike (>50 GB/24h), request spike (>100k/24h). You can Suspend a tenant, Reset their rate limit counter, or Ignore them (stored in Redis set abuse:ignored).',
    },
    {
      title: 'Audit Logs',
      content: 'Read-only log of AuditLog records. Filter by tenant ID. Currently records admin actions; you can extend the system by writing to the audit_logs table from any route.',
    },
    {
      title: 'Platform Config',
      content: 'Global platform settings stored in Redis under the key platform:config. Controls: maintenance mode, registrations open/closed, signup approval requirement, default plan for new signups, max buckets and objects per tenant, max upload size, and per-plan rate limit defaults. Changes take effect immediately; reset to defaults deletes the Redis key.',
    },
  ];

  return (
    <div className="space-y-6 max-w-2xl">
      {sections.map((s) => (
        <div key={s.title} className="bg-white/3 border border-white/8 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-2">{s.title}</h2>
          <p className="text-sm text-white/50 leading-relaxed">{s.content}</p>
        </div>
      ))}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function DocsPage() {
  const [tab, setTab] = useState('api');

  const tabs = [
    { id: 'api', label: 'API Reference' },
    { id: 'quickstart', label: 'Quick Start' },
    { id: 'admin', label: 'Admin Guide' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Help & Docs</h1>
        <p className="text-white/40 text-sm mt-0.5">
          {ENDPOINTS.length} endpoints · all routes reflect the live backend
        </p>
      </div>

      <div className="flex gap-1 bg-white/5 rounded-lg p-1 w-fit">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === t.id ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'api' && <ApiReference />}
      {tab === 'quickstart' && <QuickStart />}
      {tab === 'admin' && <AdminGuide />}
    </div>
  );
}
