"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";
import type { SessionUser } from "@/types";
import { triggerUserEvent } from "@/lib/pusher-server";

export async function getNotifications(limit = 20, offset = 0) {
  const session = await requireAuth();
  const user = session.user as SessionUser;

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.notification.count({
      where: { userId: user.id, isRead: false },
    }),
  ]);

  return { notifications, unreadCount };
}

export async function getUnreadCount() {
  const session = await requireAuth();
  const user = session.user as SessionUser;

  return prisma.notification.count({
    where: { userId: user.id, isRead: false },
  });
}

export async function markAsRead(notificationId: string) {
  await requireAuth();

  await prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });

  revalidatePath("/");
  return { success: true };
}

export async function markAllAsRead() {
  const session = await requireAuth();
  const user = session.user as SessionUser;

  await prisma.notification.updateMany({
    where: { userId: user.id, isRead: false },
    data: { isRead: true },
  });

  revalidatePath("/");
  return { success: true };
}

export async function deleteNotification(notificationId: string) {
  await requireAuth();

  await prisma.notification.delete({
    where: { id: notificationId },
  });

  return { success: true };
}

export async function createNotification({
  type,
  message,
  userId,
  link,
}: {
  type: string;
  message: string;
  userId: string;
  link?: string;
}) {
  await prisma.notification.create({
    data: { type, message, userId, link },
  });
  triggerUserEvent(userId, "new-notification", { type, message });
}

export async function notifyUsers({
  type,
  message,
  userIds,
  link,
  excludeUserId,
}: {
  type: string;
  message: string;
  userIds: string[];
  link?: string;
  excludeUserId?: string;
}) {
  const targets = excludeUserId
    ? userIds.filter((id) => id !== excludeUserId)
    : userIds;

  if (targets.length === 0) return;

  await prisma.notification.createMany({
    data: targets.map((userId) => ({
      type,
      message,
      userId,
      link,
    })),
  });

  for (const userId of targets) {
    triggerUserEvent(userId, "new-notification", { type, message });
  }
}
