import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/types";
import NotificationPage from "@/components/notification/NotificationPage";

export default async function NotificationsRoute() {
  const session = await auth();
  const user = session!.user as SessionUser;

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const unreadCount = await prisma.notification.count({
    where: { userId: user.id, isRead: false },
  });

  return <NotificationPage notifications={notifications} unreadCount={unreadCount} />;
}
