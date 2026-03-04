"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-utils";
import type { SessionUser } from "@/types";
import { subDays, startOfDay, format } from "date-fns";

export async function getBrandDashboardStats(brandId: string) {
  const session = await requireAuth();
  const _user = session.user as SessionUser;

  const [brand, boardCount, totalCards, overdueTasks, highPriorityCards, memberCount] =
    await Promise.all([
      prisma.brand.findFirst({
        where: { id: brandId, isArchived: false },
        select: { name: true, color: true },
      }),
      prisma.board.count({
        where: { brandId, isArchived: false },
      }),
      prisma.card.count({
        where: {
          isArchived: false,
          column: { board: { brandId, isArchived: false } },
        },
      }),
      prisma.card.count({
        where: {
          isArchived: false,
          dueDate: { lt: new Date() },
          column: { board: { brandId, isArchived: false } },
        },
      }),
      prisma.card.count({
        where: {
          isArchived: false,
          priority: { in: ["HIGH", "URGENT"] },
          column: { board: { brandId, isArchived: false } },
        },
      }),
      prisma.brandMember.count({
        where: { brandId },
      }),
    ]);

  return {
    brandName: brand?.name ?? "Unknown Brand",
    brandColor: brand?.color ?? null,
    boardCount,
    totalCards,
    overdueTasks,
    highPriorityCards,
    memberCount,
  };
}

export async function getBrandCardsByPriority(brandId: string) {
  const session = await requireAuth();
  const _user = session.user as SessionUser;

  const priorities = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

  const counts = await Promise.all(
    priorities.map(async (priority) => ({
      priority,
      count: await prisma.card.count({
        where: {
          isArchived: false,
          priority,
          column: { board: { brandId, isArchived: false } },
        },
      }),
    }))
  );

  return counts;
}

export async function getBrandCardsByColumn(brandId: string) {
  const session = await requireAuth();
  const _user = session.user as SessionUser;

  const columns = await prisma.column.findMany({
    where: { board: { brandId, isArchived: false } },
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

export async function getBrandActivityTrend(brandId: string) {
  const session = await requireAuth();
  const _user = session.user as SessionUser;

  const days = 14;
  const startDate = startOfDay(subDays(new Date(), days - 1));

  const activities = await prisma.activityLog.findMany({
    where: {
      createdAt: { gte: startDate },
      board: { brandId, isArchived: false },
    },
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

export async function getBrandBoardStats(brandId: string) {
  const session = await requireAuth();
  const _user = session.user as SessionUser;

  const boards = await prisma.board.findMany({
    where: { brandId, isArchived: false },
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
