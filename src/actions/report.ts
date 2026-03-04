"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-utils";
import { subDays } from "date-fns";

export async function getOverdueCards() {
  await requireAdmin();

  return prisma.card.findMany({
    where: {
      isArchived: false,
      dueDate: { lt: new Date() },
    },
    select: {
      id: true,
      title: true,
      priority: true,
      dueDate: true,
      column: {
        select: {
          title: true,
          board: { select: { id: true, title: true } },
        },
      },
      assignees: {
        include: {
          user: { select: { displayName: true } },
        },
      },
    },
    orderBy: { dueDate: "asc" },
  });
}

export async function getTeamPerformance() {
  await requireAdmin();

  const users = await prisma.user.findMany({
    where: { isActive: true, role: { not: "GUEST" } },
    select: {
      id: true,
      displayName: true,
      avatar: true,
      assignedCards: {
        where: { card: { isArchived: false } },
        select: {
          card: {
            select: {
              priority: true,
              column: { select: { title: true } },
            },
          },
        },
      },
      comments: {
        where: { createdAt: { gte: subDays(new Date(), 30) } },
        select: { id: true },
      },
      activities: {
        where: { createdAt: { gte: subDays(new Date(), 30) } },
        select: { id: true },
      },
    },
  });

  return users.map((u) => {
    const cards = u.assignedCards.map((a) => a.card);
    const done = cards.filter((c) =>
      c.column.title.toLowerCase().includes("done") ||
      c.column.title.toLowerCase().includes("complete")
    ).length;

    return {
      id: u.id,
      name: u.displayName,
      avatar: u.avatar,
      totalTasks: cards.length,
      completedTasks: done,
      activeTasks: cards.length - done,
      comments30d: u.comments.length,
      activities30d: u.activities.length,
    };
  }).sort((a, b) => b.totalTasks - a.totalTasks);
}

export async function getBoardSummaries() {
  await requireAdmin();

  const boards = await prisma.board.findMany({
    where: { isArchived: false },
    select: {
      id: true,
      title: true,
      createdAt: true,
      project: { select: { name: true } },
      _count: { select: { members: true } },
      columns: {
        select: {
          title: true,
          _count: {
            select: { cards: { where: { isArchived: false } } },
          },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return boards.map((b) => {
    const totalCards = b.columns.reduce((sum, c) => sum + c._count.cards, 0);
    const doneCards = b.columns
      .filter(
        (c) =>
          c.title.toLowerCase().includes("done") ||
          c.title.toLowerCase().includes("complete")
      )
      .reduce((sum, c) => sum + c._count.cards, 0);

    return {
      id: b.id,
      title: b.title,
      project: b.project?.name || "—",
      members: b._count.members,
      totalCards,
      doneCards,
      progress: totalCards > 0 ? Math.round((doneCards / totalCards) * 100) : 0,
      createdAt: b.createdAt,
    };
  });
}

export async function getExportData() {
  await requireAdmin();

  const cards = await prisma.card.findMany({
    where: { isArchived: false },
    select: {
      title: true,
      priority: true,
      dueDate: true,
      createdAt: true,
      column: {
        select: {
          title: true,
          board: { select: { title: true, project: { select: { name: true } } } },
        },
      },
      assignees: {
        include: { user: { select: { displayName: true } } },
      },
      _count: { select: { subtasks: true, comments: true, attachments: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return cards.map((c) => ({
    project: c.column.board.project?.name || "—",
    board: c.column.board.title,
    status: c.column.title,
    title: c.title,
    priority: c.priority,
    assignees: c.assignees.map((a) => a.user.displayName).join(", ") || "—",
    dueDate: c.dueDate ? c.dueDate.toISOString().split("T")[0] : "—",
    createdAt: c.createdAt.toISOString().split("T")[0],
    subtasks: c._count.subtasks,
    comments: c._count.comments,
    attachments: c._count.attachments,
  }));
}
