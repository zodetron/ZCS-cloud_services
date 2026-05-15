"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { PageLoader } from "@/components/ui/loading-spinner";

export function AuthGuard({ children, adminOnly = false }) {
  const router = useRouter();
  const { isAuthenticated, tenant, _hasHydrated } = useAuthStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Wait until zustand has rehydrated from localStorage before acting
    if (!_hasHydrated) return;

    if (!isAuthenticated) {
      router.replace("/auth/login");
      return;
    }

    if (adminOnly && tenant?.role !== "platform_admin") {
      router.replace("/dashboard");
      return;
    }

    setReady(true);
  }, [_hasHydrated, isAuthenticated, tenant, adminOnly, router]);

  if (!ready) return <PageLoader />;

  return children;
}
