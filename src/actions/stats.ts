"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-utils";
import type { SessionUser } from "@/types";
import { subDays, startOfDay, format } from "date-fns";

export async function getDashboardStats() {
  const session = await requireAuth();
  const user = session.user as SessionUser;
  const isSuperAdmin = user.role === "SUPER_ADMIN";

  const [
    projectCount,
    boardCount,
    totalCards,
    archivedCards,
    userCount,
    overdueTasks,
    highPriorityCards,
  ] = await Promise.all([
    prisma.project.count({ where: { isArchived: false } }),
    prisma.board.count({ where: { isArchived: false } }),
    prisma.card.count({ where: { isArchived: false } }),
    prisma.card.count({ where: { isArchived: true } }),
    isSuperAdmin ? prisma.user.count({ where: { isActive: true } }) : Promise.resolve(0),
    prisma.card.count({
      where: { isArchived: false, dueDate: { lt: new Date() } },
    }),
    prisma.card.count({
      where: { isArchived: false, priority: { in: ["HIGH", "URGENT"] } },
    }),
  ]);

  return {
    projectCount,
    boardCount,
    totalCards,
    archivedCards,
    userCount,
    overdueTasks,
    highPriorityCards,
    isSuperAdmin,
  };
}

export async function getCardsByPriority() {
  const priorities = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

  const counts = await Promise.all(
    priorities.map(async (priority) => ({
      priority,
      count: await prisma.card.count({
        where: { isArchived: false, priority },
      }),
    }))
  );

  return counts;
}

export async function getCardsByColumn() {
  const columns = await prisma.column.findMany({
    where: { board: { isArchived: false } },
    select: {
      title: true,
      _count: { select: { cards: { where: { isArchived: false } } } },
    },
  });

  const grouped: Record<string, number> = {};
  for (const col of columns) {
    const name = col.title;
    grouped[name] = (grouped[name] || 0) + col._count.cards;
  }

  return Object.entries(grouped)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

export async function getActivityTrend() {
  const days = 14;
  const startDate = startOfDay(subDays(new Date(), days - 1));

  const activities = await prisma.activityLog.findMany({
    where: { createdAt: { gte: startDate } },
    select: { createdAt: true },
  });

  const dailyCounts: Record<string, number> = {};
  for (let i = 0; i < days; i++) {
    const day = format(subDays(new Date(), days - 1 - i), "MMM dd");
    dailyCounts[day] = 0;
  }

  for (const act of activities) {
    const day = format(act.createdAt, "MMM dd");
    if (day in dailyCounts) dailyCounts[day]++;
  }

  return Object.entries(dailyCounts).map(([date, count]) => ({
    date,
    activities: count,
  }));
}

export async function getTopMembers() {
  const assignments = await prisma.cardAssignee.groupBy({
    by: ["userId"],
    _count: { userId: true },
    orderBy: { _count: { userId: "desc" } },
    take: 6,
  });

  if (assignments.length === 0) return [];

  const userIds = assignments.map((a) => a.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, displayName: true, avatar: true },
  });

  return assignments.map((a) => {
    const u = users.find((u) => u.id === a.userId);
    return {
      name: u?.displayName || "Unknown",
      avatar: u?.avatar || null,
      tasks: a._count.userId,
    };
  });
}

export async function getBoardStats() {
  const boards = await prisma.board.findMany({
    where: { isArchived: false },
    select: {
      id: true,
      title: true,
      _count: {
        select: {
          columns: true,
          members: true,
        },
      },
      columns: {
        select: {
          _count: {
            select: { cards: { where: { isArchived: false } } },
          },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 6,
  });

  return boards.map((b) => ({
    id: b.id,
    title: b.title,
    columns: b._count.columns,
    members: b._count.members,
    cards: b.columns.reduce((sum, col) => sum + col._count.cards, 0),
  }));
}
