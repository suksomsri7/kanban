"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";
import { generateKeyBetween } from "fractional-indexing";

export async function createSubtask(cardId: string, title: string, boardId: string) {
  await requireAuth();
  if (!title.trim()) return { error: "Title is required" };

  const lastSubtask = await prisma.subtask.findFirst({
    where: { cardId },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const order = generateKeyBetween(lastSubtask?.order ?? null, null);

  await prisma.subtask.create({
    data: { title: title.trim(), cardId, order },
  });

  revalidatePath(`/board/${boardId}`);
  return { success: true };
}

export async function toggleSubtask(subtaskId: string, boardId: string) {
  await requireAuth();

  const subtask = await prisma.subtask.findUnique({ where: { id: subtaskId } });
  if (!subtask) return { error: "Subtask not found" };

  await prisma.subtask.update({
    where: { id: subtaskId },
    data: { isCompleted: !subtask.isCompleted },
  });

  revalidatePath(`/board/${boardId}`);
  return { success: true };
}

export async function updateSubtaskTitle(subtaskId: string, title: string, boardId: string) {
  await requireAuth();
  if (!title.trim()) return { error: "Title is required" };

  await prisma.subtask.update({
    where: { id: subtaskId },
    data: { title: title.trim() },
  });

  revalidatePath(`/board/${boardId}`);
  return { success: true };
}

export async function deleteSubtask(subtaskId: string, boardId: string) {
  await requireAuth();

  await prisma.subtask.delete({ where: { id: subtaskId } });

  revalidatePath(`/board/${boardId}`);
  return { success: true };
}
