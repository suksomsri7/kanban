"use client";

import { useState } from "react";
import {
  BarChart3,
  Download,
  FileText,
  Users,
  Kanban,
  AlertTriangle,
  Clock,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import Button from "@/components/ui/Button";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import { format } from "date-fns";

type Tab = "overview" | "team" | "boards" | "overdue";

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "#9ca3af",
  MEDIUM: "#3b82f6",
  HIGH: "#f59e0b",
  URGENT: "#ef4444",
};

interface Props {
  overdueCards: {
    id: string;
    title: string;
    priority: string;
    dueDate: Date | null;
    column: { title: string; board: { id: string; title: string } };
    assignees: { user: { displayName: string } }[];
  }[];
  teamPerformance: {
    id: string;
    name: string;
    avatar: string | null;
    totalTasks: number;
    completedTasks: number;
    activeTasks: number;
    comments30d: number;
    activities30d: number;
  }[];
  boardSummaries: {
    id: string;
    title: string;
    brand: string;
    members: number;
    totalCards: number;
    doneCards: number;
    progress: number;
    createdAt: Date;
  }[];
  exportData: Record<string, string | number>[];
  priorityData: { priority: string; count: number }[];
  columnData: { name: string; count: number }[];
  activityData: { date: string; activities: number }[];
}

export default function ReportsClient({
  overdueCards,
  teamPerformance,
  boardSummaries,
  exportData,
  priorityData,
  columnData,
  activityData,
}: Props) {
  const [tab, setTab] = useState<Tab>("overview");
  const [pdfLoading, setPdfLoading] = useState(false);

  async function exportPDF() {
    setPdfLoading(true);
    try {
      const res = await fetch("/api/export-pdf");
      if (!res.ok) throw new Error("Failed to generate PDF");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `kanban-report-${format(new Date(), "yyyy-MM-dd")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Failed to generate PDF report");
    }
    setPdfLoading(false);
  }

  function exportCSV() {
    if (exportData.length === 0) return;
    const headers = Object.keys(exportData[0]);
    const rows = exportData.map((row) =>
      headers.map((h) => `"${String(row[h]).replace(/"/g, '""')}"`).join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kanban-report-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "overview", label: "Overview", icon: <BarChart3 size={16} /> },
    { id: "team", label: "Team", icon: <Users size={16} /> },
    { id: "boards", label: "Boards", icon: <Kanban size={16} /> },
    { id: "overdue", label: "Overdue", icon: <AlertTriangle size={16} /> },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-500 mt-1">Analytics and insights</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportPDF} variant="secondary" loading={pdfLoading}>
            <FileText size={16} className="mr-1.5" />
            PDF
          </Button>
          <Button onClick={exportCSV} variant="secondary">
            <Download size={16} className="mr-1.5" />
            CSV
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6 w-fit overflow-x-auto max-w-full">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === t.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "overview" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Activity Trend */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Activity Trend (14 Days)</h3>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={activityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#6b7280" }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 12, fill: "#6b7280" }} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "13px" }} />
                  <Area type="monotone" dataKey="activities" stroke="#111827" fill="#111827" fillOpacity={0.08} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Cards by Status */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Cards by Status</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={columnData} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#6b7280" }} />
                  <YAxis tick={{ fontSize: 12, fill: "#6b7280" }} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "13px" }} />
                  <Bar dataKey="count" fill="#111827" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Priority Distribution */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Priority Distribution</h3>
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8">
              <div className="w-48 h-48 sm:w-64 sm:h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={priorityData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={4}
                      dataKey="count"
                      nameKey="priority"
                    >
                      {priorityData.map((entry) => (
                        <Cell key={entry.priority} fill={PRIORITY_COLORS[entry.priority]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "13px" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3">
                {priorityData.map((d) => (
                  <div key={d.priority} className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PRIORITY_COLORS[d.priority] }} />
                    <span className="text-sm text-gray-700 w-20">{d.priority}</span>
                    <span className="text-sm font-semibold text-gray-900">{d.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "team" && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Member</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Total Tasks</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Completed</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Active</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Comments (30d)</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Activities (30d)</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Completion</th>
                </tr>
              </thead>
              <tbody>
                {teamPerformance.map((m) => {
                  const rate = m.totalTasks > 0 ? Math.round((m.completedTasks / m.totalTasks) * 100) : 0;
                  return (
                    <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={m.name} src={m.avatar} size="sm" />
                          <span className="text-sm font-medium text-gray-900">{m.name}</span>
                        </div>
                      </td>
                      <td className="text-center px-3 py-3 text-sm text-gray-700">{m.totalTasks}</td>
                      <td className="text-center px-3 py-3 text-sm text-green-600 font-medium">{m.completedTasks}</td>
                      <td className="text-center px-3 py-3 text-sm text-gray-700">{m.activeTasks}</td>
                      <td className="text-center px-3 py-3 text-sm text-gray-700">{m.comments30d}</td>
                      <td className="text-center px-3 py-3 text-sm text-gray-700">{m.activities30d}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-gray-900 rounded-full" style={{ width: `${rate}%` }} />
                          </div>
                          <span className="text-xs text-gray-500 w-8">{rate}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {teamPerformance.length === 0 && (
            <div className="py-12 text-center text-gray-400 text-sm">No team data available</div>
          )}
        </div>
      )}

      {tab === "boards" && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Board</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Brand</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Members</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Total Cards</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Done</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Progress</th>
                </tr>
              </thead>
              <tbody>
                {boardSummaries.map((b) => (
                  <tr key={b.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 text-sm font-medium text-gray-900">{b.title}</td>
                    <td className="px-3 py-3 text-sm text-gray-500">{b.brand}</td>
                    <td className="text-center px-3 py-3 text-sm text-gray-700">{b.members}</td>
                    <td className="text-center px-3 py-3 text-sm text-gray-700">{b.totalCards}</td>
                    <td className="text-center px-3 py-3 text-sm text-green-600 font-medium">{b.doneCards}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden w-24">
                          <div
                            className={`h-full rounded-full ${b.progress === 100 ? "bg-green-500" : "bg-gray-900"}`}
                            style={{ width: `${b.progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 w-8">{b.progress}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {boardSummaries.length === 0 && (
            <div className="py-12 text-center text-gray-400 text-sm">No boards found</div>
          )}
        </div>
      )}

      {tab === "overdue" && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {overdueCards.length === 0 ? (
            <div className="py-16 text-center">
              <Clock size={48} className="mx-auto text-gray-200 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No overdue tasks</h3>
              <p className="text-gray-400 text-sm">All tasks are on track!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Card</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Board</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Priority</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Due Date</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Assignees</th>
                  </tr>
                </thead>
                <tbody>
                  {overdueCards.map((c) => (
                    <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 text-sm font-medium text-gray-900">{c.title}</td>
                      <td className="px-3 py-3 text-sm text-gray-500">{c.column.board.title}</td>
                      <td className="px-3 py-3">
                        <Badge>{c.column.title}</Badge>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className="inline-block w-2.5 h-2.5 rounded-full mr-1.5"
                          style={{ backgroundColor: PRIORITY_COLORS[c.priority] }}
                        />
                        <span className="text-sm text-gray-700">{c.priority}</span>
                      </td>
                      <td className="px-3 py-3 text-sm text-red-500 font-medium">
                        {c.dueDate ? format(new Date(c.dueDate), "MMM dd, yyyy") : "—"}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-500">
                        {c.assignees.map((a) => a.user.displayName).join(", ") || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
