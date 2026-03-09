"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import type { SessionUser } from "@/types";

interface BrandNav {
  id: string;
  name: string;
  color: string | null;
}

interface MenuPermissions {
  canViewDashboard: boolean;
  canViewReports: boolean;
}

interface AppLayoutProps {
  user: SessionUser;
  brands: BrandNav[];
  menuPermissions: MenuPermissions;
  children: React.ReactNode;
}

export default function AppLayout({ user, brands, menuPermissions, children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar
        user={user}
        brands={brands}
        menuPermissions={menuPermissions}
        mobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
      />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Navbar user={user} onMenuToggle={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
