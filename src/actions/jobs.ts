"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import type { SessionUser } from "@/types";

export async function getMyJobs() {
  const session = await auth();
  if (!session?.user) return [];

  const user = session.user as SessionUser;

  const assignments = await prisma.cardAssignee.findMany({
    where: {
      userId: user.id,
      card: { isArchived: false },
    },
    include: {
      card: {
        include: {
          column: {
            include: {
              board: {
                select: {
                  id: true,
                  title: true,
                  color: true,
                  brand: { select: { id: true, name: true, color: true } },
                },
              },
            },
          },
          labels: { include: { label: true } },
          assignees: {
            include: {
              user: {
                select: { id: true, displayName: true, avatar: true },
              },
            },
          },
          subtasks: {
            select: { id: true, isCompleted: true },
          },
          _count: {
            select: { comments: true, attachments: true },
          },
        },
      },
    },
    orderBy: { card: { updatedAt: "desc" } },
  });

  return assignments.map((a) => ({
    id: a.card.id,
    title: a.card.title,
    description: a.card.description,
    priority: a.card.priority,
    dueDate: a.card.dueDate,
    createdAt: a.card.createdAt,
    updatedAt: a.card.updatedAt,
    columnTitle: a.card.column.title,
    boardId: a.card.column.board.id,
    boardTitle: a.card.column.board.title,
    boardColor: a.card.column.board.color,
    brandName: a.card.column.board.brand?.name || null,
    brandColor: a.card.column.board.brand?.color || null,
    labels: a.card.labels.map((l) => ({
      id: l.label.id,
      name: l.label.name,
      color: l.label.color,
    })),
    assignees: a.card.assignees.map((aa) => ({
      id: aa.user.id,
      displayName: aa.user.displayName,
      avatar: aa.user.avatar,
    })),
    subtasksTotal: a.card.subtasks.length,
    subtasksDone: a.card.subtasks.filter((s) => s.isCompleted).length,
    commentsCount: a.card._count.comments,
    attachmentsCount: a.card._count.attachments,
  }));
}
