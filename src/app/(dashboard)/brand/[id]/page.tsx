import { auth } from "@/lib/auth";
import { getBrandById } from "@/actions/brand";
import {
  getBrandDashboardStats,
  getBrandCardsByPriority,
  getBrandCardsByColumn,
  getBrandActivityTrend,
  getBrandBoardStats,
} from "@/actions/brand-stats";
import { notFound } from "next/navigation";
import type { SessionUser } from "@/types";
import Link from "next/link";
import DashboardClient from "@/components/dashboard/DashboardClient";
import BrandHeader from "@/components/brand/BrandHeader";
import {
  Kanban,
  ListChecks,
  AlertTriangle,
  Clock,
  Users,
} from "lucide-react";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function BrandDashboardPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  const user = session!.user as SessionUser;
  const brand = await getBrandById(id);

  if (!brand) notFound();

  const [stats, priorityData, columnData, activityData, boardStats] =
    await Promise.all([
      getBrandDashboardStats(id),
      getBrandCardsByPriority(id),
      getBrandCardsByColumn(id),
      getBrandActivityTrend(id),
      getBrandBoardStats(id),
    ]);

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">{brand.name}</p>
        </div>
        <BrandHeader
          brandId={id}
          brandName={brand.name}
          isSuperAdmin={user.role === "SUPER_ADMIN"}
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        <StatCard icon={<Kanban size={20} />} label="Boards" value={stats.boardCount} />
        <StatCard icon={<ListChecks size={20} />} label="Active Cards" value={stats.totalCards} />
        <StatCard icon={<AlertTriangle size={20} />} label="High Priority" value={stats.highPriorityCards} color="text-amber-500" />
        <StatCard icon={<Clock size={20} />} label="Overdue" value={stats.overdueTasks} color="text-red-500" />
        <StatCard icon={<Users size={20} />} label="Members" value={stats.memberCount} />
      </div>

      <DashboardClient
        priorityData={priorityData}
        columnData={columnData}
        activityData={activityData}
        topMembers={[]}
        boardStats={boardStats}
      />

      <div className="mt-6 bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h2>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/brand/${id}/boards`}
            className="px-3 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 text-sm text-gray-700 transition-colors"
          >
            View Boards
          </Link>
          <Link
            href={`/brand/${id}/reports`}
            className="px-3 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 text-sm text-gray-700 transition-colors"
          >
            Reports & Analytics
          </Link>
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
