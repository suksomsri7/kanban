"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Kanban,
  FolderKanban,
  Users,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  Shield,
  Plus,
  ClipboardList,
} from "lucide-react";
import { useState } from "react";
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

interface SidebarProps {
  user: SessionUser;
  brands: BrandNav[];
  menuPermissions: MenuPermissions;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export default function Sidebar({ user, brands, menuPermissions, mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedBrands, setExpandedBrands] = useState<Set<string>>(() => {
    const match = pathname.match(/^\/brand\/([^/]+)/);
    return match ? new Set([match[1]]) : new Set();
  });

  const isSuperAdmin = user.role === "SUPER_ADMIN";

  function toggleBrand(brandId: string) {
    setExpandedBrands((prev) => {
      const next = new Set(prev);
      if (next.has(brandId)) next.delete(brandId);
      else next.add(brandId);
      return next;
    });
  }

  const allBrandSubItems = [
    { name: "Dashboard", suffix: "", icon: LayoutDashboard, visible: menuPermissions.canViewDashboard },
    { name: "Boards", suffix: "/boards", icon: Kanban, visible: true },
    { name: "Reports", suffix: "/reports", icon: BarChart3, visible: menuPermissions.canViewReports },
  ];
  const brandSubItems = allBrandSubItems.filter((item) => item.visible);

  const sidebarContent = (
    <>
      <div className="h-14 flex items-center justify-between px-4 border-b border-gray-200 shrink-0">
        {!collapsed && (
          <Link href="/" className="flex items-center gap-2" onClick={onMobileClose}>
            <Kanban size={22} className="text-gray-900" />
            <span className="text-lg font-bold text-gray-900">Kanban</span>
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors hidden lg:block"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
        <button
          onClick={onMobileClose}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors lg:hidden"
        >
          <X size={18} />
        </button>
      </div>

      <nav className="flex-1 py-3 px-2 overflow-y-auto">
        {!collapsed && (
          <p className="px-3 mb-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
            Brands
          </p>
        )}

        {brands.map((brand) => {
          const isExpanded = expandedBrands.has(brand.id);
          const brandBasePath = `/brand/${brand.id}`;
          const isActiveBrand = pathname.startsWith(brandBasePath);

          return (
            <div key={brand.id} className="mb-0.5">
              <button
                onClick={() => {
                  if (collapsed) {
                    window.location.href = `${process.env.NEXT_PUBLIC_BASE_PATH || ""}${menuPermissions.canViewDashboard
                      ? brandBasePath
                      : `${brandBasePath}/boards`}`;
                  } else {
                    toggleBrand(brand.id);
                  }
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActiveBrand && !isExpanded
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
                title={collapsed ? brand.name : undefined}
              >
                <div
                  className="w-5 h-5 rounded flex items-center justify-center shrink-0"
                  style={{ backgroundColor: brand.color || "#111827" }}
                >
                  <FolderKanban size={12} className="text-white" />
                </div>
                {!collapsed && (
                  <>
                    <span className="truncate flex-1 text-left">{brand.name}</span>
                    <ChevronDown
                      size={14}
                      className={`shrink-0 text-gray-400 transition-transform ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                    />
                  </>
                )}
              </button>

              {!collapsed && isExpanded && (
                <div className="ml-4 pl-3 border-l border-gray-200 mt-0.5 space-y-0.5">
                  {brandSubItems.map((item) => {
                    const href = `${brandBasePath}${item.suffix}`;
                    const isActive =
                      item.suffix === ""
                        ? pathname === brandBasePath
                        : pathname === href;
                    return (
                      <Link
                        key={item.suffix}
                        href={href}
                        onClick={onMobileClose}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-[13px] transition-colors ${
                          isActive
                            ? "bg-gray-900 text-white"
                            : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                        }`}
                      >
                        <item.icon size={15} className="shrink-0" />
                        <span>{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {isSuperAdmin && !collapsed && (
          <Link
            href="/brands"
            onClick={onMobileClose}
            className="flex items-center gap-2 px-3 py-1.5 mt-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            <Plus size={14} />
            <span>New Brand</span>
          </Link>
        )}

        {brands.length === 0 && !collapsed && (
          <p className="px-3 py-4 text-xs text-gray-400 text-center">
            No brands available
          </p>
        )}

        <div className="my-3 mx-3 border-t border-gray-200" />
        <Link
          href="/jobs"
          onClick={onMobileClose}
          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            pathname === "/jobs"
              ? "bg-gray-900 text-white"
              : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
          }`}
          title={collapsed ? "My Jobs" : undefined}
        >
          <ClipboardList size={18} className="shrink-0" />
          {!collapsed && <span>My Jobs</span>}
        </Link>

        {isSuperAdmin && (
          <>
            <div className="my-3 mx-3 border-t border-gray-200" />
            {!collapsed && (
              <p className="px-3 mb-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                Administration
              </p>
            )}
            {[
              { name: "Users", href: "/admin/users", icon: Users },
              { name: "Roles", href: "/admin/roles", icon: Shield },
              { name: "Settings", href: "/settings", icon: Settings },
            ].map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={onMobileClose}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-gray-900 text-white"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                  title={collapsed ? item.name : undefined}
                >
                  <item.icon size={18} className="shrink-0" />
                  {!collapsed && <span>{item.name}</span>}
                </Link>
              );
            })}
          </>
        )}
      </nav>
    </>
  );

  return (
    <>
      <aside
        className={`${
          collapsed ? "w-16" : "w-60"
        } h-screen bg-white border-r border-gray-200 flex-col transition-all duration-200 shrink-0 hidden lg:flex`}
      >
        {sidebarContent}
      </aside>

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col transition-transform duration-300 lg:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
