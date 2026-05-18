'use client';

import Link from 'next/link';
import { useAuthStore } from '@/store/auth';

export function DocsNav() {
  const { isAuthenticated, tenant } = useAuthStore();

  return (
    <div className="flex items-center gap-3">
      {isAuthenticated ? (
        <>
          <span className="text-xs text-white/35 hidden sm:block">
            {tenant?.name || tenant?.email}
          </span>
          {tenant?.role === 'platform_admin' ? (
            <Link
              href="/admin"
              className="px-3 py-1.5 text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg transition-colors"
            >
              Admin Panel →
            </Link>
          ) : (
            <Link
              href="/dashboard"
              className="px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 text-white/70 border border-white/10 rounded-lg transition-colors"
            >
              Dashboard →
            </Link>
          )}
        </>
      ) : (
        <>
          <Link
            href="/dashboard"
            className="px-3 py-1.5 text-xs text-white/50 hover:text-white/80 transition-colors"
          >
            Dashboard
          </Link>
          <Link
            href="/auth/login"
            className="px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 text-white/70 border border-white/10 rounded-lg transition-colors"
          >
            Sign in
          </Link>
        </>
      )}
    </div>
  );
}
