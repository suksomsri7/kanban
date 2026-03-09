"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";
import type { SessionUser } from "@/types";
import { requireBoardPermission } from "@/lib/permissions";

export async function addDependency(dependentId: string, blockingId: string, boardId: string) {
  const session = await requireAuth();
  const user = session.user as SessionUser;

  const { allowed, error: permErr } = await requireBoardPermission(boardId, user.id, user.role, "canAddDependency");
  if (!allowed) return { error: permErr || "Permission denied" };

  if (dependentId === blockingId) {
    return { error: "A card cannot depend on itself" };
  }

  const existing = await prisma.cardDependency.findUnique({
    where: { dependentId_blockingId: { dependentId, blockingId } },
  });
  if (existing) return { error: "Dependency already exists" };

  const reverse = await prisma.cardDependency.findUnique({
    where: { dependentId_blockingId: { dependentId: blockingId, blockingId: dependentId } },
  });
  if (reverse) return { error: "Circular dependency detected" };

  await prisma.cardDependency.create({
    data: { dependentId, blockingId },
  });

  revalidatePath(`/board/${boardId}`);
  return { success: true };
}

export async function removeDependency(dependencyId: string, boardId: string) {
  const session = await requireAuth();
  const user = session.user as SessionUser;

  const { allowed, error: permErr } = await requireBoardPermission(boardId, user.id, user.role, "canAddDependency");
  if (!allowed) return { error: permErr || "Permission denied" };

  await prisma.cardDependency.delete({ where: { id: dependencyId } });

  revalidatePath(`/board/${boardId}`);
  return { success: true };
}

export async function getAvailableCardsForDependency(boardId: string, excludeCardId: string) {
  await requireAuth();

  return prisma.card.findMany({
    where: {
      column: { boardId },
      isArchived: false,
      id: { not: excludeCardId },
    },
    select: { id: true, title: true, column: { select: { title: true } } },
    orderBy: { title: "asc" },
  });
}
