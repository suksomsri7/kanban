"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ColumnData } from "./BoardView";

interface CalendarViewProps {
  columns: ColumnData[];
  onCardClick: (cardId: string) => void;
}

const PRIORITY_COLORS: Record<string, string> = {
  URGENT: "bg-red-500",
  HIGH: "bg-orange-500",
  MEDIUM: "bg-blue-500",
  LOW: "bg-gray-400",
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function CalendarView({ columns, onCardClick }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const allCards = useMemo(() => {
    return columns.flatMap((col) =>
      col.cards.map((card) => ({ ...card, columnTitle: col.title, columnColor: col.color }))
    );
  }, [columns]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPad = firstDay.getDay();
    const totalDays = lastDay.getDate();

    const days: { date: Date; isCurrentMonth: boolean }[] = [];

    for (let i = startPad - 1; i >= 0; i--) {
      days.push({ date: new Date(year, month, -i), isCurrentMonth: false });
    }

    for (let d = 1; d <= totalDays; d++) {
      days.push({ date: new Date(year, month, d), isCurrentMonth: true });
    }

    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
      }
    }

    return days;
  }, [year, month]);

  const cardsByDate = useMemo(() => {
    const map = new Map<string, typeof allCards>();
    for (const card of allCards) {
      if (!card.dueDate) continue;
      const d = new Date(card.dueDate);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const existing = map.get(key) || [];
      existing.push(card);
      map.set(key, existing);
    }
    return map;
  }, [allCards]);

  const noDueDateCards = useMemo(() => allCards.filter((c) => !c.dueDate), [allCards]);

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;

  function prevMonth() {
    setCurrentDate(new Date(year, month - 1, 1));
  }

  function nextMonth() {
    setCurrentDate(new Date(year, month + 1, 1));
  }

  function goToToday() {
    setCurrentDate(new Date());
  }

  return (
    <div className="flex-1 overflow-auto p-3 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-lg font-semibold text-gray-900 min-w-[180px] text-center">
            {MONTH_NAMES[month]} {year}
          </h2>
          <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            <ChevronRight size={20} />
          </button>
          <button onClick={goToToday} className="ml-2 px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
            Today
          </button>
        </div>
        {noDueDateCards.length > 0 && (
          <span className="text-xs text-gray-400">
            {noDueDateCards.length} card{noDueDateCards.length > 1 ? "s" : ""} without due date
          </span>
        )}
      </div>

      <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
        <div className="grid grid-cols-7">
          {WEEKDAYS.map((day) => (
            <div key={day} className="px-2 py-2.5 text-xs font-semibold text-gray-500 text-center bg-gray-50 border-b border-gray-200">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {calendarDays.map(({ date, isCurrentMonth }, i) => {
            const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
            const dayCards = cardsByDate.get(dateKey) || [];
            const isToday = dateKey === todayKey;

            return (
              <div
                key={i}
                className={`min-h-[100px] sm:min-h-[120px] border-b border-r border-gray-100 p-1.5 ${
                  !isCurrentMonth ? "bg-gray-50/50" : ""
                } ${isToday ? "bg-blue-50/40" : ""}`}
              >
                <div className={`text-xs font-medium mb-1 ${
                  isToday
                    ? "text-white bg-blue-600 w-6 h-6 rounded-full flex items-center justify-center"
                    : isCurrentMonth ? "text-gray-700" : "text-gray-300"
                }`}>
                  {date.getDate()}
                </div>

                <div className="space-y-0.5">
                  {dayCards.slice(0, 3).map((card) => (
                    <button
                      key={card.id}
                      onClick={() => onCardClick(card.id)}
                      className="w-full text-left px-1.5 py-1 rounded-md text-[11px] leading-tight truncate hover:opacity-80 transition-opacity flex items-center gap-1 group"
                      style={{ backgroundColor: card.columnColor ? `${card.columnColor}15` : "#f3f4f6" }}
                      title={`${card.title} (${card.columnTitle})`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${PRIORITY_COLORS[card.priority] || "bg-gray-400"}`} />
                      <span className="truncate text-gray-700">{card.title}</span>
                    </button>
                  ))}
                  {dayCards.length > 3 && (
                    <div className="text-[10px] text-gray-400 pl-1">
                      +{dayCards.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
