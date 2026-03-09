import { auth } from "@/lib/auth";
import { getBrandById } from "@/actions/brand";
import {
  getBrandOverdueCards,
  getBrandTeamPerformance,
  getBrandBoardSummaries,
  getBrandExportData,
} from "@/actions/brand-report";
import {
  getBrandCardsByPriority,
  getBrandCardsByColumn,
  getBrandActivityTrend,
} from "@/actions/brand-stats";
import { notFound, redirect } from "next/navigation";
import { getUserMenuPermissions } from "@/lib/permissions";
import type { SessionUser } from "@/types";
import ReportsClient from "@/components/report/ReportsClient";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function BrandReportsPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  const user = session!.user as SessionUser;

  const menuPerms = await getUserMenuPermissions();
  if (!menuPerms.canViewReports) {
    redirect(`/brand/${id}/boards`);
  }

  const brand = await getBrandById(id);

  if (!brand) notFound();

  const [overdue, team, summaries, exportData, priority, column, activity] =
    await Promise.all([
      getBrandOverdueCards(id),
      getBrandTeamPerformance(id),
      getBrandBoardSummaries(id),
      getBrandExportData(id),
      getBrandCardsByPriority(id),
      getBrandCardsByColumn(id),
      getBrandActivityTrend(id),
    ]);

  return (
    <div>
      <div className="mb-2">
        <p className="text-sm text-gray-500">{brand.name}</p>
      </div>
      <ReportsClient
        overdueCards={overdue}
        teamPerformance={team}
        boardSummaries={summaries}
        exportData={exportData}
        priorityData={priority}
        columnData={column}
        activityData={activity}
      />
    </div>
  );
}
