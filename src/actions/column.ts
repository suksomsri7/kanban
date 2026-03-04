"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";
import { z } from "zod/v4";
import { triggerBoardEvent } from "@/lib/pusher-server";

const CreateColumnSchema = z.object({
  title: z.string().min(1, "Title is required").max(50),
  boardId: z.string(),
  order: z.string(),
});

export async function createColumn(formData: FormData) {
  await requireAuth();

  const raw = {
    title: formData.get("title") as string,
    boardId: formData.get("boardId") as string,
    order: formData.get("order") as string,
  };

  const parsed = CreateColumnSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const column = await prisma.column.create({
    data: {
      title: parsed.data.title,
      boardId: parsed.data.boardId,
      order: parsed.data.order,
    },
  });

  revalidatePath(`/board/${parsed.data.boardId}`);
  triggerBoardEvent(parsed.data.boardId, "column-created", { columnId: column.id });
  return { success: true, columnId: column.id };
}

export async function updateColumn(columnId: string, title: string) {
  await requireAuth();

  const column = await prisma.column.update({
    where: { id: columnId },
    data: { title },
  });

  revalidatePath(`/board/${column.boardId}`);
  return { success: true };
}

export async function deleteColumn(columnId: string) {
  await requireAuth();

  const column = await prisma.column.findUnique({
    where: { id: columnId },
    select: { boardId: true, _count: { select: { cards: true } } },
  });

  if (!column) return { error: "Column not found" };
  if (column._count.cards > 0) {
    return { error: "Cannot delete column with cards. Move or delete cards first." };
  }

  await prisma.column.delete({ where: { id: columnId } });

  revalidatePath(`/board/${column.boardId}`);
  return { success: true };
}

export async function reorderColumns(boardId: string, updates: { id: string; order: string }[]) {
  await requireAuth();

  await prisma.$transaction(
    updates.map((u) =>
      prisma.column.update({
        where: { id: u.id },
        data: { order: u.order },
      })
    )
  );

  revalidatePath(`/board/${boardId}`);
  return { success: true };
}
