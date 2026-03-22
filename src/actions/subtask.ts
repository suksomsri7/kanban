"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";
import { generateKeyBetween } from "fractional-indexing";
import { logActivity } from "@/actions/activity";
import type { SessionUser } from "@/types";
import { requireBoardPermission } from "@/lib/permissions";

export async function createSubtask(cardId: string, title: string, boardId: string) {
  const session = await requireAuth();
  const user = session.user as SessionUser;

  const { allowed, error: permErr } = await requireBoardPermission(boardId, user.id, user.role, "canManageSubtasks");
  if (!allowed) return { error: permErr || "Permission denied" };

  if (!title.trim()) return { error: "Title is required" };

  const lastSubtask = await prisma.subtask.findFirst({
    where: { cardId },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const order = generateKeyBetween(lastSubtask?.order ?? null, null);

  const subtask = await prisma.subtask.create({
    data: { title: title.trim(), cardId, order },
  });

  revalidatePath(`/board/${boardId}`);
  return { success: true, subtask };
}

export async function toggleSubtask(subtaskId: string, boardId: string) {
  const session = await requireAuth();
  const user = session.user as SessionUser;

  const { allowed, error: permErr } = await requireBoardPermission(boardId, user.id, user.role, "canManageSubtasks");
  if (!allowed) return { error: permErr || "Permission denied" };

  const subtask = await prisma.subtask.findUnique({
    where: { id: subtaskId },
    include: { card: { select: { id: true } } },
  });
  if (!subtask) return { error: "Subtask not found" };

  const newState = !subtask.isCompleted;
  await prisma.subtask.update({
    where: { id: subtaskId },
    data: { isCompleted: newState },
  });

  await logActivity(
    newState ? "SUBTASK_COMPLETED" : "SUBTASK_UNCOMPLETED",
    boardId,
    user.id,
    { title: subtask.title },
    subtask.card.id
  );

  revalidatePath(`/board/${boardId}`);
  return { success: true };
}

export async function updateSubtaskTitle(subtaskId: string, title: string, boardId: string) {
  const session = await requireAuth();
  const user = session.user as SessionUser;

  const { allowed, error: permErr } = await requireBoardPermission(boardId, user.id, user.role, "canManageSubtasks");
  if (!allowed) return { error: permErr || "Permission denied" };

  if (!title.trim()) return { error: "Title is required" };

  await prisma.subtask.update({
    where: { id: subtaskId },
    data: { title: title.trim() },
  });

  revalidatePath(`/board/${boardId}`);
  return { success: true };
}

export async function deleteSubtask(subtaskId: string, boardId: string) {
  const session = await requireAuth();
  const user = session.user as SessionUser;

  const { allowed, error: permErr } = await requireBoardPermission(boardId, user.id, user.role, "canManageSubtasks");
  if (!allowed) return { error: permErr || "Permission denied" };

  await prisma.subtask.delete({ where: { id: subtaskId } });

  revalidatePath(`/board/${boardId}`);
  return { success: true };
}
