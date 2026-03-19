"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";
import { z } from "zod/v4";
import { logActivity } from "@/actions/activity";
import { triggerBoardEvent } from "@/lib/pusher-server";
import type { SessionUser } from "@/types";
import { requireBoardPermission } from "@/lib/permissions";

const CreateColumnSchema = z.object({
  title: z.string().min(1, "Title is required").max(50),
  boardId: z.string(),
  order: z.string(),
});

export async function createColumn(formData: FormData) {
  const session = await requireAuth();
  const user = session.user as SessionUser;

  const raw = {
    title: formData.get("title") as string,
    boardId: formData.get("boardId") as string,
    order: formData.get("order") as string,
  };

  const parsed = CreateColumnSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { allowed, error: permErr } = await requireBoardPermission(parsed.data.boardId, user.id, user.role, "canAddColumn");
  if (!allowed) return { error: permErr || "Permission denied" };

  const column = await prisma.column.create({
    data: {
      title: parsed.data.title,
      boardId: parsed.data.boardId,
      order: parsed.data.order,
    },
  });

  await logActivity("COLUMN_CREATED", parsed.data.boardId, user.id, { title: parsed.data.title });

  revalidatePath(`/board/${parsed.data.boardId}`);
  triggerBoardEvent(parsed.data.boardId, "column-created", { columnId: column.id });
  return { success: true, columnId: column.id };
}

export async function updateColumn(columnId: string, title: string) {
  const session = await requireAuth();
  const user = session.user as SessionUser;

  const col = await prisma.column.findUnique({ where: { id: columnId }, select: { boardId: true } });
  if (!col) return { error: "Column not found" };

  const { allowed, error: permErr } = await requireBoardPermission(col.boardId, user.id, user.role, "canEditColumn");
  if (!allowed) return { error: permErr || "Permission denied" };

  const column = await prisma.column.update({
    where: { id: columnId },
    data: { title },
  });

  await logActivity("COLUMN_UPDATED", column.boardId, user.id, { title });

  revalidatePath(`/board/${column.boardId}`);
  return { success: true };
}

export async function deleteColumn(columnId: string) {
  const session = await requireAuth();
  const user = session.user as SessionUser;

  const column = await prisma.column.findUnique({
    where: { id: columnId },
    select: { boardId: true, title: true, _count: { select: { cards: true } } },
  });

  if (!column) return { error: "Column not found" };

  const { allowed, error: permErr } = await requireBoardPermission(column.boardId, user.id, user.role, "canDeleteColumn");
  if (!allowed) return { error: permErr || "Permission denied" };

  if (column._count.cards > 0) {
    return { error: "Cannot delete column with cards. Move or delete cards first." };
  }

  await logActivity("COLUMN_DELETED", column.boardId, user.id, { title: column.title });
  await prisma.column.delete({ where: { id: columnId } });

  revalidatePath(`/board/${column.boardId}`);
  return { success: true };
}

export async function getColumnSettings(columnId: string) {
  await requireAuth();
  return prisma.column.findUnique({
    where: { id: columnId },
    select: {
      id: true,
      title: true,
      boardId: true,
      automationType: true,
      aiProvider: true,
      aiModel: true,
      cronEnabled: true,
      cronExpr: true,
      cronTimezone: true,
      apiKey: true,
      webhook: true,
      prompt: true,
      automationStatus: true,
      openclawUrl: true,
      openclawApiKey: true,
      openclawPermissions: true,
    },
  });
}

export async function updateColumnSettings(
  columnId: string,
  data: {
    automationType?: string;
    aiProvider?: string | null;
    aiModel?: string | null;
    cronEnabled?: boolean;
    cronExpr?: string | null;
    cronTimezone?: string | null;
    apiKey?: string | null;
    webhook?: string | null;
    prompt?: string | null;
    automationStatus?: string;
    openclawUrl?: string | null;
    openclawApiKey?: string | null;
    openclawPermissions?: Record<string, boolean> | null;
  }
) {
  const session = await requireAuth();
  const user = session.user as SessionUser;

  const col = await prisma.column.findUnique({ where: { id: columnId }, select: { boardId: true } });
  if (!col) return { error: "Column not found" };

  const { allowed, error: permErr } = await requireBoardPermission(col.boardId, user.id, user.role, "canEditColumn");
  if (!allowed) return { error: permErr || "Permission denied" };

  const { openclawPermissions, ...rest } = data;
  await prisma.column.update({
    where: { id: columnId },
    data: {
      ...rest,
      openclawPermissions: openclawPermissions === null
        ? Prisma.JsonNull
        : openclawPermissions === undefined
          ? undefined
          : openclawPermissions,
    },
  });

  revalidatePath(`/board/${col.boardId}`);
  return { success: true };
}

export async function reorderColumns(boardId: string, updates: { id: string; order: string }[]) {
  const session = await requireAuth();
  const user = session.user as SessionUser;

  const { allowed, error: permErr } = await requireBoardPermission(boardId, user.id, user.role, "canMoveCard");
  if (!allowed) return { error: permErr || "Permission denied" };

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
