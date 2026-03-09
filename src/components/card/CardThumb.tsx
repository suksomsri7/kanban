"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { MessageSquare, Paperclip, CheckSquare, Calendar, AlertTriangle, Lock } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import { format, isPast, isToday } from "date-fns";

interface CardThumbProps {
  card: {
    id: string;
    title: string;
    priority: string;
    dueDate: Date | string | null;
    assignees: { user: { id: string; displayName: string; avatar: string | null } }[];
    labels: { label: { id: string; name: string; color: string } }[];
    lockedFields?: unknown;
    _count: { comments: number; attachments: number; subtasks: number };
  };
  onCardClick: (cardId: string) => void;
  isDragOverlay?: boolean;
  canDrag?: boolean;
}

const priorityColors: Record<string, string> = {
  URGENT: "border-l-red-500",
  HIGH: "border-l-orange-400",
  MEDIUM: "border-l-blue-400",
  LOW: "border-l-gray-300",
};

export default function CardThumb({ card, onCardClick, isDragOverlay, canDrag = true }: CardThumbProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card.id,
    data: { type: "card" },
    disabled: isDragOverlay || !canDrag,
  });

  const style = isDragOverlay
    ? { transform: "rotate(3deg)" }
    : {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
      };

  const dueDate = card.dueDate ? new Date(card.dueDate) : null;
  const isOverdue = dueDate && isPast(dueDate) && !isToday(dueDate);
  const isDueToday = dueDate && isToday(dueDate);

  const lf = card.lockedFields;
  const parsedLocked: string[] = (() => {
    if (!lf) return [];
    const v = typeof lf === "string" ? JSON.parse(lf) : lf;
    return Array.isArray(v) ? v : [];
  })();
  const hasLocks = parsedLocked.length > 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onCardClick(card.id)}
      className={`bg-white rounded-lg border border-gray-200 p-3 cursor-pointer hover:border-gray-300 hover:shadow-sm transition-all border-l-[3px] ${
        priorityColors[card.priority] || "border-l-gray-300"
      } ${isDragOverlay ? "shadow-lg" : ""}`}
    >
      {/* Labels */}
      {card.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {card.labels.map((cl) => (
            <span
              key={cl.label.id}
              className="px-2 py-0.5 rounded-full text-[10px] font-medium text-white"
              style={{ backgroundColor: cl.label.color }}
            >
              {cl.label.name}
            </span>
          ))}
        </div>
      )}

      {/* Title */}
      <div className="flex items-start gap-1.5">
        <p className="text-sm text-gray-900 font-medium leading-snug flex-1">{card.title}</p>
        {hasLocks && (
          <Lock size={12} className="text-amber-500 shrink-0 mt-0.5" />
        )}
      </div>

      {/* Meta row */}
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-2 text-gray-400">
          {dueDate && (
            <span
              className={`flex items-center gap-1 text-[11px] ${
                isOverdue
                  ? "text-red-600"
                  : isDueToday
                  ? "text-amber-600"
                  : "text-gray-400"
              }`}
            >
              {isOverdue && <AlertTriangle size={11} />}
              <Calendar size={11} />
              {format(dueDate, "MMM d")}
            </span>
          )}
          {card._count.comments > 0 && (
            <span className="flex items-center gap-0.5 text-[11px]">
              <MessageSquare size={11} />
              {card._count.comments}
            </span>
          )}
          {card._count.attachments > 0 && (
            <span className="flex items-center gap-0.5 text-[11px]">
              <Paperclip size={11} />
              {card._count.attachments}
            </span>
          )}
          {card._count.subtasks > 0 && (
            <span className="flex items-center gap-0.5 text-[11px]">
              <CheckSquare size={11} />
              {card._count.subtasks}
            </span>
          )}
        </div>

        {card.assignees.length > 0 && (
          <div className="flex -space-x-1.5">
            {card.assignees.slice(0, 3).map((a) => (
              <Avatar
                key={a.user.id}
                name={a.user.displayName}
                src={a.user.avatar}
                size="sm"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
