"use client";

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
import Avatar from "@/components/ui/Avatar";

interface PriorityData {
  priority: string;
  count: number;
}

interface ColumnData {
  name: string;
  count: number;
}

interface ActivityData {
  date: string;
  activities: number;
}

interface MemberData {
  name: string;
  avatar: string | null;
  tasks: number;
}

interface BoardData {
  id: string;
  title: string;
  columns: number;
  members: number;
  cards: number;
}

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "#9ca3af",
  MEDIUM: "#3b82f6",
  HIGH: "#f59e0b",
  URGENT: "#ef4444",
};

export function PriorityChart({ data }: { data: PriorityData[] }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Cards by Priority</h3>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={4}
            dataKey="count"
            nameKey="priority"
          >
            {data.map((entry) => (
              <Cell key={entry.priority} fill={PRIORITY_COLORS[entry.priority] || "#6b7280"} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "13px" }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex justify-center gap-4 mt-2">
        {data.map((d) => (
          <div key={d.priority} className="flex items-center gap-1.5 text-xs text-gray-500">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: PRIORITY_COLORS[d.priority] }}
            />
            {d.priority} ({d.count})
          </div>
        ))}
      </div>
    </div>
  );
}

export function ColumnChart({ data }: { data: ColumnData[] }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Cards by Status</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} barSize={28}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#6b7280" }} />
          <YAxis tick={{ fontSize: 12, fill: "#6b7280" }} allowDecimals={false} />
          <Tooltip
            contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "13px" }}
          />
          <Bar dataKey="count" fill="#111827" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ActivityChart({ data }: { data: ActivityData[] }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Activity (Last 14 Days)</h3>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#6b7280" }} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 12, fill: "#6b7280" }} allowDecimals={false} />
          <Tooltip
            contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "13px" }}
          />
          <Area type="monotone" dataKey="activities" stroke="#111827" fill="#111827" fillOpacity={0.08} strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TopMembers({ data }: { data: MemberData[] }) {
  const maxTasks = Math.max(...data.map((d) => d.tasks), 1);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Top Members</h3>
      {data.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">No assigned tasks yet</p>
      ) : (
        <div className="space-y-3">
          {data.map((m, i) => (
            <div key={i} className="flex items-center gap-3">
              <Avatar name={m.name} src={m.avatar} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-700 truncate">{m.name}</span>
                  <span className="text-xs text-gray-400 ml-2">{m.tasks} tasks</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gray-900 rounded-full transition-all"
                    style={{ width: `${(m.tasks / maxTasks) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function BoardOverview({ data }: { data: BoardData[] }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Board Overview</h3>
      {data.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">No boards yet</p>
      ) : (
        <div className="space-y-2">
          {data.map((b) => (
            <div key={b.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{b.title}</p>
                <p className="text-xs text-gray-400">{b.members} members</p>
              </div>
              <div className="text-right shrink-0 ml-3">
                <p className="text-sm font-semibold text-gray-900">{b.cards}</p>
                <p className="text-xs text-gray-400">cards</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
