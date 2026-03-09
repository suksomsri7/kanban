"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";

export async function createLabel(boardId: string, name: string, color: string) {
  await requireAuth();

  const trimmed = name.trim();
  if (!trimmed) return { error: "Name is required" };
  if (!color) return { error: "Color is required" };

  const existing = await prisma.label.findUnique({
    where: { boardId_name: { boardId, name: trimmed } },
  });
  if (existing) return { error: "Label name already exists" };

  const label = await prisma.label.create({
    data: { name: trimmed, color, boardId },
  });

  revalidatePath(`/board/${boardId}`);
  return { success: true, label };
}

export async function updateLabel(labelId: string, name: string, color: string, boardId: string) {
  await requireAuth();

  const trimmed = name.trim();
  if (!trimmed) return { error: "Name is required" };

  const label = await prisma.label.findUnique({ where: { id: labelId } });
  if (!label) return { error: "Label not found" };

  const duplicate = await prisma.label.findFirst({
    where: { boardId: label.boardId, name: trimmed, NOT: { id: labelId } },
  });
  if (duplicate) return { error: "Label name already exists" };

  await prisma.label.update({
    where: { id: labelId },
    data: { name: trimmed, color },
  });

  revalidatePath(`/board/${boardId}`);
  return { success: true };
}

export async function deleteLabel(labelId: string, boardId: string) {
  await requireAuth();

  await prisma.label.delete({ where: { id: labelId } });

  revalidatePath(`/board/${boardId}`);
  return { success: true };
}
