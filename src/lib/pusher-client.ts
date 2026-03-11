import PusherClient from "pusher-js";

let pusherClient: PusherClient | null = null;

export function getPusherClient(): PusherClient | null {
  if (typeof window === "undefined") return null;

  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  if (!key) return null;

  if (!pusherClient) {
    const host = process.env.NEXT_PUBLIC_PUSHER_HOST;
    const port = process.env.NEXT_PUBLIC_PUSHER_PORT;

    if (host) {
      pusherClient = new PusherClient(key, {
        wsHost: host,
        wsPort: port ? parseInt(port) : 6001,
        forceTLS: false,
        enabledTransports: ["ws", "wss"],
        disableStats: true,
      });
    } else {
      const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
      if (!cluster) return null;
      pusherClient = new PusherClient(key, { cluster });
    }
  }

  return pusherClient;
}
