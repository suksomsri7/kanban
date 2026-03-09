"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";
import { z } from "zod/v4";
import type { SessionUser } from "@/types";
import { createNotification, notifyUsers } from "@/actions/notification";
import { logActivity } from "@/actions/activity";
import { triggerBoardEvent } from "@/lib/pusher-server";
import { requireBoardPermission } from "@/lib/permissions";

const CreateCardSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  columnId: z.string(),
  order: z.string(),
});

const UpdateCardSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  dueDate: z.string().nullable().optional(),
});

export async function getCardById(cardId: string) {
  await requireAuth();

  return prisma.card.findUnique({
    where: { id: cardId },
    include: {
      column: { select: { id: true, title: true, boardId: true } },
      assignees: {
        include: {
          user: { select: { id: true, displayName: true, username: true, avatar: true } },
        },
      },
      labels: { include: { label: true } },
      comments: {
        include: {
          author: { select: { id: true, displayName: true, avatar: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      attachments: {
        include: {
          uploader: { select: { id: true, displayName: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      subtasks: { orderBy: { order: "asc" } },
      dependencies: {
        include: { blocking: { select: { id: true, title: true } } },
      },
      dependedBy: {
        include: { dependent: { select: { id: true, title: true } } },
      },
    },
  });
}

export async function createCard(formData: FormData) {
  const session = await requireAuth();
  const user = session.user as SessionUser;

  const raw = {
    title: formData.get("title") as string,
    columnId: formData.get("columnId") as string,
    order: formData.get("order") as string,
  };

  const parsed = CreateCardSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const column = await prisma.column.findUnique({
    where: { id: parsed.data.columnId },
    select: { boardId: true },
  });

  if (!column) return { error: "Column not found" };

  const { allowed, error: permErr } = await requireBoardPermission(column.boardId, user.id, user.role, "canCreateCard");
  if (!allowed) return { error: permErr || "Permission denied" };

  const card = await prisma.card.create({
    data: {
      title: parsed.data.title,
      columnId: parsed.data.columnId,
      order: parsed.data.order,
    },
  });

  await logActivity("CARD_CREATED", column.boardId, user.id, { title: parsed.data.title }, card.id);

  revalidatePath(`/board/${column.boardId}`);
  triggerBoardEvent(column.boardId, "card-created", { cardId: card.id });
  return { success: true, cardId: card.id };
}

export async function updateCard(formData: FormData) {
  const session = await requireAuth();
  const user = session.user as SessionUser;

  const raw = {
    id: formData.get("id") as string,
    title: (formData.get("title") as string) || undefined,
    description: formData.has("description")
      ? (formData.get("description") as string)
      : undefined,
    priority: (formData.get("priority") as string) || undefined,
    dueDate: formData.has("dueDate")
      ? (formData.get("dueDate") as string) || null
      : undefined,
  };

  const parsed = UpdateCardSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { id, dueDate, ...data } = parsed.data;

  const existing = await prisma.card.findUnique({
    where: { id },
    select: { column: { select: { boardId: true } }, lockedFields: true },
  });
  if (!existing) return { error: "Card not found" };

  const boardId = existing.column.boardId;
  const { allowed, permissions: perms, error: permErr } = await requireBoardPermission(boardId, user.id, user.role, "canView");
  if (!allowed) return { error: permErr || "Permission denied" };

  if (!perms.isFullAccess) {
    const lf = existing.lockedFields;
    const locked: string[] = (() => {
      if (!lf) return [];
      const v = typeof lf === "string" ? JSON.parse(lf) : lf;
      return Array.isArray(v) ? v : [];
    })();

    const fieldPermMap: Record<string, { perm: keyof typeof perms; lockKey: string }> = {
      title: { perm: "canEditCardTitle", lockKey: "title" },
      description: { perm: "canEditCardDescription", lockKey: "description" },
      priority: { perm: "canEditCardPriority", lockKey: "priority" },
      dueDate: { perm: "canEditCardDueDate", lockKey: "dueDate" },
    };

    for (const [field, { perm, lockKey }] of Object.entries(fieldPermMap)) {
      const val = field === "dueDate" ? dueDate : (data as Record<string, unknown>)[field];
      if (val === undefined) continue;
      if (!perms[perm]) return { error: `Permission denied: ${perm}` };
      if (!perms.canLockCard && locked.includes(lockKey)) return { error: `Field "${field}" is locked` };
    }
  }

  const card = await prisma.card.update({
    where: { id },
    data: {
      ...data,
      ...(dueDate !== undefined
        ? { dueDate: dueDate ? new Date(dueDate) : null }
        : {}),
    },
    include: { column: { select: { boardId: true } } },
  });

  await logActivity("CARD_UPDATED", card.column.boardId, user.id, { ...data }, card.id);

  revalidatePath(`/board/${card.column.boardId}`);
  return { success: true };
}

export async function moveCard(
  cardId: string,
  targetColumnId: string,
  newOrder: string,
  boardId: string
) {
  const session = await requireAuth();
  const user = session.user as SessionUser;

  const { allowed, error: permErr } = await requireBoardPermission(boardId, user.id, user.role, "canMoveCard");
  if (!allowed) return { error: permErr || "Permission denied" };

  await prisma.card.update({
    where: { id: cardId },
    data: { columnId: targetColumnId, order: newOrder },
  });

  revalidatePath(`/board/${boardId}`);
  return { success: true };
}

export async function reorderCards(boardId: string, updates: { id: string; columnId: string; order: string }[]) {
  const session = await requireAuth();
  const user = session.user as SessionUser;

  const { allowed, error: permErr } = await requireBoardPermission(boardId, user.id, user.role, "canMoveCard");
  if (!allowed) return { error: permErr || "Permission denied" };

  await prisma.$transaction(
    updates.map((u) =>
      prisma.card.update({
        where: { id: u.id },
        data: { columnId: u.columnId, order: u.order },
      })
    )
  );

  for (const u2 of updates) {
    await logActivity("CARD_MOVED", boardId, user.id, { columnId: u2.columnId }, u2.id);
  }

  revalidatePath(`/board/${boardId}`);
  triggerBoardEvent(boardId, "card-moved", { updates });
  return { success: true };
}

export async function deleteCard(cardId: string) {
  const session = await requireAuth();
  const user = session.user as SessionUser;

  const card = await prisma.card.findUnique({
    where: { id: cardId },
    select: { title: true, column: { select: { boardId: true } } },
  });

  if (!card) return { error: "Card not found" };

  const { allowed, error: permErr } = await requireBoardPermission(card.column.boardId, user.id, user.role, "canDeleteCard");
  if (!allowed) return { error: permErr || "Permission denied" };

  await logActivity("CARD_DELETED", card.column.boardId, user.id, { title: card.title });
  await prisma.card.delete({ where: { id: cardId } });

  revalidatePath(`/board/${card.column.boardId}`);
  return { success: true };
}

export async function archiveCard(cardId: string) {
  const session = await requireAuth();
  const user = session.user as SessionUser;

  const existing = await prisma.card.findUnique({
    where: { id: cardId },
    select: { column: { select: { boardId: true } } },
  });
  if (!existing) return { error: "Card not found" };

  const { allowed, error: permErr } = await requireBoardPermission(existing.column.boardId, user.id, user.role, "canDeleteCard");
  if (!allowed) return { error: permErr || "Permission denied" };

  const card = await prisma.card.update({
    where: { id: cardId },
    data: { isArchived: true },
    include: { column: { select: { boardId: true } } },
  });

  await logActivity("CARD_ARCHIVED", card.column.boardId, user.id, { title: card.title }, card.id);

  revalidatePath(`/board/${card.column.boardId}`);
  return { success: true };
}

export async function toggleCardLabel(cardId: string, labelId: string, boardId: string) {
  const session = await requireAuth();
  const user = session.user as SessionUser;

  const { allowed, error: permErr } = await requireBoardPermission(boardId, user.id, user.role, "canEditCardLabels");
  if (!allowed) return { error: permErr || "Permission denied" };

  const existing = await prisma.cardLabel.findUnique({
    where: { cardId_labelId: { cardId, labelId } },
  });

  if (existing) {
    await prisma.cardLabel.delete({ where: { id: existing.id } });
  } else {
    await prisma.cardLabel.create({ data: { cardId, labelId } });
  }

  revalidatePath(`/board/${boardId}`);
  return { success: true };
}

export async function toggleCardAssignee(cardId: string, userId: string, boardId: string) {
  const session = await requireAuth();
  const currentUser = session.user as SessionUser;

  const { allowed, error: permErr } = await requireBoardPermission(boardId, currentUser.id, currentUser.role, "canEditCardAssignees");
  if (!allowed) return { error: permErr || "Permission denied" };

  const existing = await prisma.cardAssignee.findUnique({
    where: { cardId_userId: { cardId, userId } },
  });

  if (existing) {
    await prisma.cardAssignee.delete({ where: { id: existing.id } });
    await logActivity("CARD_UNASSIGNED", boardId, currentUser.id, { userId }, cardId);
  } else {
    await prisma.cardAssignee.create({ data: { cardId, userId } });
    await logActivity("CARD_ASSIGNED", boardId, currentUser.id, { userId }, cardId);

    if (userId !== currentUser.id) {
      const card = await prisma.card.findUnique({ where: { id: cardId }, select: { title: true } });
      await createNotification({
        type: "ASSIGNED",
        message: `${currentUser.displayName} assigned you to "${card?.title}"`,
        userId,
        link: `/board/${boardId}`,
      });
    }
  }

  revalidatePath(`/board/${boardId}`);
  return { success: true };
}

export async function addComment(cardId: string, content: string, boardId: string) {
  const session = await requireAuth();
  const user = session.user as SessionUser;

  const { allowed, error: permErr } = await requireBoardPermission(boardId, user.id, user.role, "canComment");
  if (!allowed) return { error: permErr || "Permission denied" };

  if (!content.trim()) return { error: "Comment cannot be empty" };

  await prisma.comment.create({
    data: { content: content.trim(), cardId, authorId: user.id },
  });

  const card = await prisma.card.findUnique({
    where: { id: cardId },
    select: { title: true, assignees: { select: { userId: true } } },
  });

  if (card) {
    const assigneeIds = card.assignees.map((a) => a.userId);
    await notifyUsers({
      type: "COMMENT",
      message: `${user.displayName} commented on "${card.title}"`,
      userIds: assigneeIds,
      link: `/board/${boardId}`,
      excludeUserId: user.id,
    });

    const mentionRegex = /@(\w+)/g;
    const mentions = [...content.matchAll(mentionRegex)].map((m) => m[1]);
    if (mentions.length > 0) {
      const mentionedUsers = await prisma.user.findMany({
        where: { username: { in: mentions } },
        select: { id: true },
      });
      const mentionedIds = mentionedUsers
        .map((u) => u.id)
        .filter((id) => id !== user.id && !assigneeIds.includes(id));
      if (mentionedIds.length > 0) {
        await notifyUsers({
          type: "MENTIONED",
          message: `${user.displayName} mentioned you in a comment on "${card.title}"`,
          userIds: mentionedIds,
          link: `/board/${boardId}`,
        });
      }
    }
  }

  await logActivity("COMMENT_ADDED", boardId, user.id, { preview: content.trim().slice(0, 80) }, cardId);

  revalidatePath(`/board/${boardId}`);
  triggerBoardEvent(boardId, "comment-added", { cardId });
  return { success: true };
}

export async function deleteComment(commentId: string, boardId: string) {
  const session = await requireAuth();
  const user = session.user as SessionUser;

  const { allowed, error: permErr } = await requireBoardPermission(boardId, user.id, user.role, "canComment");
  if (!allowed) return { error: permErr || "Permission denied" };

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { cardId: true },
  });

  await prisma.comment.delete({ where: { id: commentId } });
  await logActivity("COMMENT_DELETED", boardId, user.id, {}, comment?.cardId ?? undefined);

  revalidatePath(`/board/${boardId}`);
  return { success: true };
}

export async function updateCardLockedFields(
  cardId: string,
  lockedFields: string[],
  boardId: string
) {
  const session = await requireAuth();
  const user = session.user as SessionUser;

  const { allowed, error: permErr } = await requireBoardPermission(boardId, user.id, user.role, "canLockCard");
  if (!allowed) return { error: permErr || "Permission denied" };

  await prisma.card.update({
    where: { id: cardId },
    data: { lockedFields: JSON.stringify(lockedFields) },
  });

  revalidatePath(`/board/${boardId}`);
  return { success: true };
}
