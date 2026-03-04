import { auth } from "@/lib/auth";
import type { SessionUser } from "@/types";
import {
  getDashboardStats,
  getCardsByPriority,
  getCardsByColumn,
  getActivityTrend,
  getTopMembers,
  getBoardStats,
} from "@/actions/stats";
import {
  FolderKanban,
  Kanban,
  Users,
  ListChecks,
  AlertTriangle,
  Clock,
  Archive,
} from "lucide-react";
import Link from "next/link";
import DashboardClient from "@/components/dashboard/DashboardClient";

export default async function DashboardPage() {
  const session = await auth();
  const user = session!.user as SessionUser;

  const [stats, priorityData, columnData, activityData, topMembers, boardStats] =
    await Promise.all([
      getDashboardStats(),
      getCardsByPriority(),
      getCardsByColumn(),
      getActivityTrend(),
      getTopMembers(),
      getBoardStats(),
    ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Welcome back, {user.displayName}</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3 mb-6">
        <StatCard icon={<FolderKanban size={20} />} label="Projects" value={stats.projectCount} />
        <StatCard icon={<Kanban size={20} />} label="Boards" value={stats.boardCount} />
        <StatCard icon={<ListChecks size={20} />} label="Active Cards" value={stats.totalCards} />
        <StatCard icon={<Archive size={20} />} label="Archived" value={stats.archivedCards} />
        <StatCard icon={<AlertTriangle size={20} />} label="High Priority" value={stats.highPriorityCards} color="text-amber-500" />
        <StatCard icon={<Clock size={20} />} label="Overdue" value={stats.overdueTasks} color="text-red-500" />
        {stats.isSuperAdmin && (
          <StatCard icon={<Users size={20} />} label="Users" value={stats.userCount} />
        )}
      </div>

      {/* Charts */}
      <DashboardClient
        priorityData={priorityData}
        columnData={columnData}
        activityData={activityData}
        topMembers={topMembers}
        boardStats={boardStats}
      />

      {/* Quick Actions */}
      <div className="mt-6 bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h2>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/projects"
            className="px-3 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 text-sm text-gray-700 transition-colors"
          >
            View Projects
          </Link>
          <Link
            href="/boards"
            className="px-3 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 text-sm text-gray-700 transition-colors"
          >
            View Boards
          </Link>
          <Link
            href="/reports"
            className="px-3 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 text-sm text-gray-700 transition-colors"
          >
            Reports & Analytics
          </Link>
          {stats.isSuperAdmin && (
            <Link
              href="/admin/users"
              className="px-3 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 text-sm text-gray-700 transition-colors"
            >
              Manage Users
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <div className={color || "text-gray-400"}>{icon}</div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}
