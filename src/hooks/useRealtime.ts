"use client";

import { useEffect, useCallback, useRef, useTransition } from "react";
import { getPusherClient } from "@/lib/pusher-client";
import { useRouter } from "next/navigation";

export function useBoardRealtime(boardId: string) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      // #region agent log
      console.log('[DBG-3e7644] Pusher refresh triggered', {boardId, ts: Date.now()});
      // #endregion
      startTransition(() => router.refresh());
    }, 300);
  }, [router, startTransition, boardId]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

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
