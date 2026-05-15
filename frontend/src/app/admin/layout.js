"use client";

import { AuthGuard } from "@/components/auth/auth-guard";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { Topbar } from "@/components/dashboard/topbar";

export default function AdminLayout({ children }) {
  return (
    <AuthGuard adminOnly>
      <div className="flex h-screen overflow-hidden bg-background">
        <AdminSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Topbar />
          <main className="flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
