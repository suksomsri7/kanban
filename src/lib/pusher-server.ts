import Pusher from "pusher";

let pusherInstance: Pusher | null = null;

export function getPusher(): Pusher | null {
  if (
    !process.env.PUSHER_APP_ID ||
    !process.env.PUSHER_KEY ||
    !process.env.PUSHER_SECRET
  ) {
    return null;
  }

  if (!pusherInstance) {
    const options: ConstructorParameters<typeof Pusher>[0] = {
      appId: process.env.PUSHER_APP_ID,
      key: process.env.PUSHER_KEY,
      secret: process.env.PUSHER_SECRET,
      useTLS: process.env.PUSHER_USE_TLS !== "false",
    };

    if (process.env.PUSHER_HOST) {
      options.host = process.env.PUSHER_HOST;
      options.port = process.env.PUSHER_PORT || "6001";
      options.useTLS = false;
    } else {
      options.cluster = process.env.PUSHER_CLUSTER || "ap1";
    }

    pusherInstance = new Pusher(options);
  }

  return pusherInstance;
}

export async function triggerBoardEvent(
  boardId: string,
  event: string,
  data: Record<string, unknown>
) {
  const pusher = getPusher();
  if (!pusher) return;

  try {
    await pusher.trigger(`board-${boardId}`, event, data);
  } catch {
    // Pusher not configured — silent fail
  }
}

export async function triggerUserEvent(
  userId: string,
  event: string,
  data: Record<string, unknown>
) {
  const pusher = getPusher();
  if (!pusher) return;

  try {
    await pusher.trigger(`user-${userId}`, event, data);
  } catch {
    // silent
  }
}
