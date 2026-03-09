"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  Filter,
  Calendar,
  MessageSquare,
  Paperclip,
  CheckSquare,
  ArrowUpDown,
  Kanban,
  ClipboardList,
} from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import { format, isPast, isToday, isTomorrow } from "date-fns";

interface Job {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  dueDate: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  columnTitle: string;
  boardId: string;
  boardTitle: string;
  boardColor: string | null;
  brandName: string | null;
  brandColor: string | null;
  labels: { id: string; name: string; color: string }[];
  assignees: { id: string; displayName: string; avatar: string | null }[];
  subtasksTotal: number;
  subtasksDone: number;
  commentsCount: number;
  attachmentsCount: number;
}

type SortKey = "updatedAt" | "priority" | "dueDate" | "title";
type FilterPriority = "ALL" | "URGENT" | "HIGH" | "MEDIUM" | "LOW";

const priorityOrder: Record<string, number> = {
  URGENT: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

const priorityColors: Record<string, string> = {
  URGENT: "bg-red-100 text-red-700",
  HIGH: "bg-orange-100 text-orange-700",
  MEDIUM: "bg-blue-100 text-blue-700",
  LOW: "bg-gray-100 text-gray-600",
};

function getDueDateInfo(dueDate: Date | string | null) {
  if (!dueDate) return null;
  const d = new Date(dueDate);
  if (isPast(d) && !isToday(d)) return { text: format(d, "MMM d"), className: "text-red-600 bg-red-50" };
  if (isToday(d)) return { text: "Today", className: "text-amber-600 bg-amber-50" };
  if (isTomorrow(d)) return { text: "Tomorrow", className: "text-amber-600 bg-amber-50" };
  return { text: format(d, "MMM d"), className: "text-gray-500 bg-gray-50" };
}

export default function JobsList({ initialJobs }: { initialJobs: Job[] }) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("updatedAt");
  const [filterPriority, setFilterPriority] = useState<FilterPriority>("ALL");
  const [filterBoard, setFilterBoard] = useState<string>("ALL");

  const boards = useMemo(() => {
    const map = new Map<string, { id: string; title: string; color: string | null }>();
    for (const j of initialJobs) {
      if (!map.has(j.boardId)) {
        map.set(j.boardId, { id: j.boardId, title: j.boardTitle, color: j.boardColor });
      }
    }
    return Array.from(map.values());
  }, [initialJobs]);

  const filtered = useMemo(() => {
    let list = initialJobs;

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (j) =>
          j.title.toLowerCase().includes(q) ||
          j.boardTitle.toLowerCase().includes(q) ||
          j.columnTitle.toLowerCase().includes(q) ||
          j.labels.some((l) => l.name.toLowerCase().includes(q))
      );
    }

    if (filterPriority !== "ALL") {
      list = list.filter((j) => j.priority === filterPriority);
    }

    if (filterBoard !== "ALL") {
      list = list.filter((j) => j.boardId === filterBoard);
    }

    list = [...list].sort((a, b) => {
      switch (sortKey) {
        case "priority":
          return (priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9);
        case "dueDate": {
          const da = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
          const db = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
          return da - db;
        }
        case "title":
          return a.title.localeCompare(b.title);
        default:
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
    });

    return list;
  }, [initialJobs, search, sortKey, filterPriority, filterBoard]);

  const groupedByBoard = useMemo(() => {
    const map = new Map<string, { boardTitle: string; boardColor: string | null; brandName: string | null; jobs: Job[] }>();
    for (const j of filtered) {
      if (!map.has(j.boardId)) {
        map.set(j.boardId, {
          boardTitle: j.boardTitle,
          boardColor: j.boardColor,
          brandName: j.brandName,
          jobs: [],
        });
      }
      map.get(j.boardId)!.jobs.push(j);
    }
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search cards..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          />
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Filter size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value as FilterPriority)}
              className="pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 appearance-none cursor-pointer"
            >
              <option value="ALL">All Priority</option>
              <option value="URGENT">Urgent</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>
          {boards.length > 1 && (
            <div className="relative">
              <Kanban size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <select
                value={filterBoard}
                onChange={(e) => setFilterBoard(e.target.value)}
                className="pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 appearance-none cursor-pointer"
              >
                <option value="ALL">All Boards</option>
                {boards.map((b) => (
                  <option key={b.id} value={b.id}>{b.title}</option>
                ))}
              </select>
            </div>
          )}
          <div className="relative">
            <ArrowUpDown size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 appearance-none cursor-pointer"
            >
              <option value="updatedAt">Recently Updated</option>
              <option value="priority">Priority</option>
              <option value="dueDate">Due Date</option>
              <option value="title">Title</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-2xl font-bold text-gray-900">{initialJobs.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Total Cards</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-2xl font-bold text-red-600">
            {initialJobs.filter((j) => j.priority === "URGENT" || j.priority === "HIGH").length}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">High / Urgent</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-2xl font-bold text-amber-600">
            {initialJobs.filter((j) => j.dueDate && (isPast(new Date(j.dueDate)) || isToday(new Date(j.dueDate)))).length}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">Overdue / Today</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-2xl font-bold text-gray-900">{boards.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Boards</p>
        </div>
      </div>

      {/* Cards grouped by board */}
      {groupedByBoard.length === 0 ? (
        <div className="text-center py-16">
          <ClipboardList size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {initialJobs.length === 0 ? "No cards assigned to you" : "No matching cards"}
          </h3>
          <p className="text-gray-500 text-sm">
            {initialJobs.length === 0
              ? "When you get assigned to cards, they will appear here."
              : "Try adjusting your search or filters."}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {groupedByBoard.map(([boardId, group]) => (
            <div key={boardId}>
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: group.boardColor || "#111827" }}
                />
                <h2 className="text-sm font-semibold text-gray-700">
                  {group.brandName && (
                    <span className="text-gray-400 font-normal">{group.brandName} / </span>
                  )}
                  {group.boardTitle}
                </h2>
                <span className="text-xs text-gray-400">({group.jobs.length})</span>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
                {group.jobs.map((job) => {
                  const due = getDueDateInfo(job.dueDate);
                  return (
                    <Link
                      key={job.id}
                      href={`/board/${job.boardId}?card=${job.id}`}
                      className="flex items-start gap-4 p-4 hover:bg-gray-50 transition-colors group"
                    >
                      <div
                        className="w-1 self-stretch rounded-full shrink-0 mt-0.5"
                        style={{
                          backgroundColor:
                            job.priority === "URGENT" ? "#ef4444" :
                            job.priority === "HIGH" ? "#f97316" :
                            job.priority === "MEDIUM" ? "#3b82f6" : "#d1d5db",
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="text-sm font-medium text-gray-900 group-hover:text-black truncate">
                              {job.title}
                            </h3>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded ${priorityColors[job.priority]}`}>
                                {job.priority}
                              </span>
                              <span className="text-[11px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">
                                {job.columnTitle}
                              </span>
                              {job.labels.map((l) => (
                                <span
                                  key={l.id}
                                  className="text-[11px] font-medium px-1.5 py-0.5 rounded text-white"
                                  style={{ backgroundColor: l.color }}
                                >
                                  {l.name}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            {due && (
                              <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded flex items-center gap-1 ${due.className}`}>
                                <Calendar size={10} />
                                {due.text}
                              </span>
                            )}
                            <div className="flex -space-x-1.5">
                              {job.assignees.slice(0, 3).map((a) => (
                                <Avatar key={a.id} name={a.displayName} src={a.avatar} size="xs" />
                              ))}
                              {job.assignees.length > 3 && (
                                <span className="w-5 h-5 rounded-full bg-gray-200 text-[9px] font-medium text-gray-600 flex items-center justify-center">
                                  +{job.assignees.length - 3}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        {(job.subtasksTotal > 0 || job.commentsCount > 0 || job.attachmentsCount > 0) && (
                          <div className="flex items-center gap-3 mt-2 text-gray-400">
                            {job.subtasksTotal > 0 && (
                              <span className={`flex items-center gap-1 text-[11px] ${
                                job.subtasksDone === job.subtasksTotal ? "text-green-600" : ""
                              }`}>
                                <CheckSquare size={12} />
                                {job.subtasksDone}/{job.subtasksTotal}
                              </span>
                            )}
                            {job.commentsCount > 0 && (
                              <span className="flex items-center gap-1 text-[11px]">
                                <MessageSquare size={12} />
                                {job.commentsCount}
                              </span>
                            )}
                            {job.attachmentsCount > 0 && (
                              <span className="flex items-center gap-1 text-[11px]">
                                <Paperclip size={12} />
                                {job.attachmentsCount}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
