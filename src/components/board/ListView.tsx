"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Clock, AlertTriangle } from "lucide-react";
import type { ColumnData, CardData } from "./BoardView";

interface ListViewProps {
  columns: ColumnData[];
  labels: { id: string; name: string; color: string }[];
  onCardClick: (cardId: string) => void;
}

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  URGENT: { label: "Urgent", color: "text-red-700", bg: "bg-red-50 border-red-200" },
  HIGH: { label: "High", color: "text-orange-700", bg: "bg-orange-50 border-orange-200" },
  MEDIUM: { label: "Medium", color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
  LOW: { label: "Low", color: "text-gray-600", bg: "bg-gray-50 border-gray-200" },
};

function formatDate(date: Date | string | null): string {
  if (!date) return "—";
  const d = new Date(date);
  return d.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });
}

function isOverdue(date: Date | string | null): boolean {
  if (!date) return false;
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d < new Date();
}

export default function ListView({ columns, labels: _labels, onCardClick }: ListViewProps) {
  const [collapsedColumns, setCollapsedColumns] = useState<Set<string>>(new Set());

  const toggleColumn = (colId: string) => {
    setCollapsedColumns((prev) => {
      const next = new Set(prev);
      if (next.has(colId)) next.delete(colId);
      else next.add(colId);
      return next;
    });
  };

  const totalCards = useMemo(() => columns.reduce((sum, col) => sum + col.cards.length, 0), [columns]);

  return (
    <div className="flex-1 overflow-auto p-3 sm:p-6">
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-[1fr_120px_100px_110px_140px] sm:grid-cols-[1fr_140px_110px_120px_160px] gap-px bg-gray-50 border-b border-gray-200 px-4 py-2.5">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Title ({totalCards})
          </div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Status
          </div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Priority
          </div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Due Date
          </div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Assignees
          </div>
        </div>

        {/* Columns with cards */}
        {columns.map((column) => {
          const isCollapsed = collapsedColumns.has(column.id);

          return (
            <div key={column.id}>
              {/* Column header row */}
              <button
                onClick={() => toggleColumn(column.id)}
                className="w-full grid grid-cols-[1fr_120px_100px_110px_140px] sm:grid-cols-[1fr_140px_110px_120px_160px] gap-px px-4 py-2 bg-gray-50/70 border-b border-gray-100 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: column.color || "#6b7280" }}
                  />
                  {column.title}
                  <span className="text-xs font-normal text-gray-400">
                    {column.cards.length}
                  </span>
                </div>
              </button>

              {/* Cards */}
              {!isCollapsed && column.cards.map((card: CardData) => {
                const priority = PRIORITY_CONFIG[card.priority] || PRIORITY_CONFIG.MEDIUM;
                const overdue = isOverdue(card.dueDate);

                return (
                  <button
                    key={card.id}
                    onClick={() => onCardClick(card.id)}
                    className="w-full grid grid-cols-[1fr_120px_100px_110px_140px] sm:grid-cols-[1fr_140px_110px_120px_160px] gap-px px-4 py-2.5 border-b border-gray-50 hover:bg-gray-50 transition-colors text-left"
                  >
                    {/* Title + Labels */}
                    <div className="min-w-0 pr-2">
                      <div className="text-sm text-gray-900 truncate">{card.title}</div>
                      {card.labels.length > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {card.labels.slice(0, 3).map((l) => (
                            <span
                              key={l.label.id}
                              className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium text-white truncate max-w-[80px]"
                              style={{ backgroundColor: l.label.color }}
                            >
                              {l.label.name}
                            </span>
                          ))}
                          {card.labels.length > 3 && (
                            <span className="text-[10px] text-gray-400">+{card.labels.length - 3}</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Status (Column name) */}
                    <div className="flex items-center">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 truncate">
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: column.color || "#6b7280" }}
                        />
                        {column.title}
                      </span>
                    </div>

                    {/* Priority */}
                    <div className="flex items-center">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${priority.bg} ${priority.color}`}>
                        {priority.label}
                      </span>
                    </div>

                    {/* Due Date */}
                    <div className="flex items-center">
                      {card.dueDate ? (
                        <span className={`flex items-center gap-1 text-xs ${overdue ? "text-red-600 font-medium" : "text-gray-500"}`}>
                          {overdue ? <AlertTriangle size={12} /> : <Clock size={12} />}
                          {formatDate(card.dueDate)}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </div>

                    {/* Assignees */}
                    <div className="flex items-center">
                      {card.assignees.length > 0 ? (
                        <div className="flex -space-x-1.5">
                          {card.assignees.slice(0, 3).map((a) => (
                            <div
                              key={a.user.id}
                              title={a.user.displayName}
                              className="w-6 h-6 rounded-full bg-gray-800 text-white flex items-center justify-center text-[10px] font-medium ring-2 ring-white"
                            >
                              {a.user.displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                            </div>
                          ))}
                          {card.assignees.length > 3 && (
                            <div className="w-6 h-6 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center text-[10px] font-medium ring-2 ring-white">
                              +{card.assignees.length - 3}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </div>
                  </button>
                );
              })}

              {!isCollapsed && column.cards.length === 0 && (
                <div className="px-4 py-3 text-xs text-gray-300 italic border-b border-gray-50">
                  No cards
                </div>
              )}
            </div>
          );
        })}

        {columns.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-gray-400">
            No columns in this board
          </div>
        )}
      </div>
    </div>
  );
}
