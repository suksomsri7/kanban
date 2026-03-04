"use client";

import { signOut } from "next-auth/react";
import { LogOut, Menu } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import NotificationBell from "@/components/layout/NotificationBell";
import type { SessionUser } from "@/types";
import { useState, useRef, useEffect } from "react";

interface NavbarProps {
  user: SessionUser;
  onMenuToggle: () => void;
}

export default function Navbar({ user, onMenuToggle }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const roleLabel = user.role.replace("_", " ");

  return (
    <header className="h-14 sm:h-16 bg-white border-b border-gray-200 flex items-center justify-between px-3 sm:px-6 shrink-0">
      <button
        onClick={onMenuToggle}
        className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors lg:hidden"
      >
        <Menu size={20} />
      </button>
      <div className="hidden lg:block" />

      <div className="flex items-center gap-2 sm:gap-4">
        <NotificationBell />

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 sm:gap-3 hover:bg-gray-50 rounded-lg px-1.5 sm:px-2 py-1.5 transition-colors"
          >
            <Avatar name={user.displayName} src={user.avatar} size="sm" />
            <div className="text-left hidden sm:block">
              <p className="text-sm font-medium text-gray-900">
                {user.displayName}
              </p>
              <p className="text-xs text-gray-500">{roleLabel}</p>
            </div>
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl border border-gray-200 shadow-lg py-2 z-50">
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-900">
                  {user.displayName}
                </p>
                <p className="text-xs text-gray-500">@{user.username}</p>
                <Badge className="mt-1">{roleLabel}</Badge>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut size={16} />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
