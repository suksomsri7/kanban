"use client";

import { useState } from "react";
import { Bell, Check, CheckCheck, Trash2, ExternalLink } from "lucide-react";
import { markAsRead, markAllAsRead, deleteNotification } from "@/actions/notification";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import Button from "@/components/ui/Button";

interface Notification {
  id: string;
  type: string;
  message: string;
  isRead: boolean;
  link: string | null;
  createdAt: Date;
}

const typeIcons: Record<string, string> = {
  ASSIGNED: "👤",
  COMMENT: "💬",
  MENTIONED: "📢",
  DUE_SOON: "⏰",
  CARD_MOVED: "📋",
  BOARD_INVITE: "📌",
};

export default function NotificationPage({
  notifications: initial,
  unreadCount: initialUnread,
}: {
  notifications: Notification[];
  unreadCount: number;
}) {
  const router = useRouter();
  const [notifications, setNotifications] = useState(initial);
  const [unreadCount, setUnreadCount] = useState(initialUnread);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const filtered =
    filter === "unread" ? notifications.filter((n) => !n.isRead) : notifications;

  async function handleMarkAsRead(id: string) {
    await markAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }

  async function handleMarkAllRead() {
    await markAllAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  }

  async function handleDelete(id: string) {
    const n = notifications.find((n) => n.id === id);
    await deleteNotification(id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    if (n && !n.isRead) setUnreadCount((prev) => Math.max(0, prev - 1));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-500 mt-1">
            {unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}`
              : "All caught up!"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="secondary" onClick={handleMarkAllRead}>
            <CheckCheck size={16} className="mr-1.5" />
            Mark all as read
          </Button>
        )}
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setFilter("all")}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            filter === "all" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => setFilter("unread")}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            filter === "unread" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Unread ({unreadCount})
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Bell size={48} className="mx-auto text-gray-200 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {filter === "unread" ? "No unread notifications" : "No notifications"}
            </h3>
            <p className="text-gray-400 text-sm">
              {filter === "unread"
                ? "You're all caught up!"
                : "Notifications will appear here when there are updates."}
            </p>
          </div>
        ) : (
          filtered.map((n) => (
            <div
              key={n.id}
              className={`flex items-start gap-4 px-5 py-4 border-b border-gray-50 hover:bg-gray-50 transition-colors group ${
                !n.isRead ? "bg-blue-50/40" : ""
              }`}
            >
              <span className="text-xl mt-0.5 shrink-0">
                {typeIcons[n.type] || "🔔"}
              </span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm leading-relaxed ${!n.isRead ? "font-medium text-gray-900" : "text-gray-600"}`}>
                  {n.message}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {!n.isRead && (
                  <button
                    onClick={() => handleMarkAsRead(n.id)}
                    className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Mark as read"
                  >
                    <Check size={16} />
                  </button>
                )}
                {n.link && (
                  <button
                    onClick={() => router.push(n.link!)}
                    className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Go to item"
                  >
                    <ExternalLink size={16} />
                  </button>
                )}
                <button
                  onClick={() => handleDelete(n.id)}
                  className="p-1.5 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
