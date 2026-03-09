import { requireAdmin } from "@/lib/auth-utils";
import { getUserMenuPermissions } from "@/lib/permissions";
import { redirect } from "next/navigation";
import {
  getOverdueCards,
  getTeamPerformance,
  getBoardSummaries,
  getExportData,
} from "@/actions/report";
import { getCardsByPriority, getCardsByColumn, getActivityTrend } from "@/actions/stats";
import ReportsClient from "@/components/report/ReportsClient";

export default async function ReportsPage() {
  await requireAdmin();

  const menuPerms = await getUserMenuPermissions();
  if (!menuPerms.canViewReports) {
    redirect("/");
  }

  const [
    overdueCards,
    teamPerformance,
    boardSummaries,
    exportData,
    priorityData,
    columnData,
    activityData,
  ] = await Promise.all([
    getOverdueCards(),
    getTeamPerformance(),
    getBoardSummaries(),
    getExportData(),
    getCardsByPriority(),
    getCardsByColumn(),
    getActivityTrend(),
  ]);

  return (
    <ReportsClient
      overdueCards={overdueCards}
      teamPerformance={teamPerformance}
      boardSummaries={boardSummaries}
      exportData={exportData}
      priorityData={priorityData}
      columnData={columnData}
      activityData={activityData}
    />
  );
}
