"use client";

import { useState, useEffect } from "react";
import { X, Activity, ChevronDown } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import { getActivities } from "@/actions/activity";
import { format } from "date-fns";

interface ActivityPanelProps {
  boardId: string;
  isOpen: boolean;
  onClose: () => void;
}

type ActivityItem = {
  id: string;
  action: string;
  details: Record<string, unknown>;
  createdAt: Date | string;
  user: { id: string; displayName: string; avatar: string | null };
  card: { id: string; title: string } | null;
};

const actionLabels: Record<string, string> = {
  CARD_CREATED: "created card",
  CARD_UPDATED: "updated card",
  CARD_MOVED: "moved card",
  CARD_ARCHIVED: "archived card",
  CARD_DELETED: "deleted card",
  CARD_ASSIGNED: "assigned",
  CARD_UNASSIGNED: "unassigned",
  COMMENT_ADDED: "commented on",
  COMMENT_DELETED: "deleted comment on",
  ATTACHMENT_ADDED: "attached file to",
  ATTACHMENT_DELETED: "removed attachment from",
  COLUMN_CREATED: "created column",
  COLUMN_UPDATED: "updated column",
  COLUMN_DELETED: "deleted column",
  BOARD_CREATED: "created this board",
  BOARD_UPDATED: "updated this board",
  MEMBER_ADDED: "added member",
  MEMBER_REMOVED: "removed member",
  SUBTASK_COMPLETED: "completed subtask",
  SUBTASK_UNCOMPLETED: "uncompleted subtask",
};

export default function ActivityPanel({ boardId, isOpen, onClose }: ActivityPanelProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) loadActivities(1);
  }, [isOpen, boardId]);

  async function loadActivities(p: number) {
    setLoading(true);
    const data = await getActivities(boardId, p);
    if (p === 1) {
      setActivities(data.activities as unknown as ActivityItem[]);
    } else {
      setActivities((prev) => [...prev, ...(data.activities as unknown as ActivityItem[])]);
    }
    setPage(p);
    setTotalPages(data.pages);
    setLoading(false);
  }

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-0 h-full w-80 bg-white border-l border-gray-200 shadow-xl z-40 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
          <Activity size={16} />
          Activity
        </h3>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activities.length === 0 && !loading && (
          <p className="text-sm text-gray-400 text-center py-8">No activity yet</p>
        )}

        <div className="space-y-4">
          {activities.map((act) => (
            <div key={act.id} className="flex gap-2.5">
              <Avatar name={act.user.displayName} src={act.user.avatar} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700">
                  <span className="font-medium">{act.user.displayName}</span>{" "}
                  {actionLabels[act.action] || act.action}
                  {act.card && (
                    <>
                      {" "}
                      <span className="font-medium">&quot;{act.card.title}&quot;</span>
                    </>
                  )}
                </p>
                {act.details && typeof act.details === "object" && (act.details as Record<string, string>).from ? (
                  <p className="text-xs text-gray-400 mt-0.5">
                    {(act.details as Record<string, string>).from} → {(act.details as Record<string, string>).to}
                  </p>
                ) : null}
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {format(new Date(act.createdAt), "MMM d, HH:mm")}
                </p>
              </div>
            </div>
          ))}
        </div>

        {page < totalPages && (
          <button
            onClick={() => loadActivities(page + 1)}
            disabled={loading}
            className="w-full flex items-center justify-center gap-1 py-2 text-sm text-gray-500 hover:text-gray-700 mt-4"
          >
            <ChevronDown size={14} />
            {loading ? "Loading..." : "Load more"}
          </button>
        )}
      </div>
    </div>
  );
}
