"use client";

import { useEffect, useCallback } from "react";
import { getPusherClient } from "@/lib/pusher-client";
import { useRouter } from "next/navigation";

export function useBoardRealtime(boardId: string) {
  const router = useRouter();

  const refresh = useCallback(() => {
    router.refresh();
  }, [router]);

  useEffect(() => {
    const pusher = getPusherClient();
    if (!pusher) return;

    const channel = pusher.subscribe(`board-${boardId}`);

    channel.bind("card-moved", refresh);
    channel.bind("card-created", refresh);
    channel.bind("card-updated", refresh);
    channel.bind("card-deleted", refresh);
    channel.bind("column-created", refresh);
    channel.bind("column-updated", refresh);
    channel.bind("column-deleted", refresh);
    channel.bind("comment-added", refresh);
    channel.bind("member-changed", refresh);

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(`board-${boardId}`);
    };
  }, [boardId, refresh]);
}

export function useNotificationRealtime(userId: string, onNewNotification?: () => void) {
  useEffect(() => {
    const pusher = getPusherClient();
    if (!pusher) return;

    const channel = pusher.subscribe(`user-${userId}`);

    channel.bind("new-notification", () => {
      onNewNotification?.();
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(`user-${userId}`);
    };
  }, [userId, onNewNotification]);
}
