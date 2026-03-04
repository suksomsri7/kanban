"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-utils";
import type { ActivityAction } from "@prisma/client";
import type { SessionUser } from "@/types";

export async function logActivity(
  action: ActivityAction,
  boardId: string,
  userId: string,
  details: Record<string, unknown>,
  cardId?: string
) {
  await prisma.activityLog.create({
    data: {
      action,
      boardId,
      userId,
      cardId: cardId || null,
      details: details as any,
    },
  });
}

export async function getActivities(boardId: string, page = 1, limit = 30) {
  await requireAuth();

  const [activities, total] = await Promise.all([
    prisma.activityLog.findMany({
      where: { boardId },
      include: {
        user: { select: { id: true, displayName: true, avatar: true } },
        card: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: (page - 1) * limit,
    }),
    prisma.activityLog.count({ where: { boardId } }),
  ]);

  return { activities, total, pages: Math.ceil(total / limit) };
}
