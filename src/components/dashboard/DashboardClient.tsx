"use client";

import {
  PriorityChart,
  ColumnChart,
  ActivityChart,
  TopMembers,
  BoardOverview,
} from "@/components/dashboard/DashboardCharts";

interface Props {
  priorityData: { priority: string; count: number }[];
  columnData: { name: string; count: number }[];
  activityData: { date: string; activities: number }[];
  topMembers: { name: string; avatar: string | null; tasks: number }[];
  boardStats: { id: string; title: string; columns: number; members: number; cards: number }[];
}

export default function DashboardClient({
  priorityData,
  columnData,
  activityData,
  topMembers,
  boardStats,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ActivityChart data={activityData} />
        <ColumnChart data={columnData} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <PriorityChart data={priorityData} />
        <TopMembers data={topMembers} />
        <BoardOverview data={boardStats} />
      </div>
    </div>
  );
}
