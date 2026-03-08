"use server";

import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";

export async function getUsersWithAccess() {
  await requireSuperAdmin();

  return prisma.user.findMany({
    select: {
      id: true,
      username: true,
      displayName: true,
      role: true,
      avatar: true,
      isActive: true,
      brandMembers: {
        select: {
          brandId: true,
          role: true,
          brand: { select: { id: true, name: true, color: true } },
        },
      },
      boardMembers: {
        select: {
          boardId: true,
          role: true,
          board: {
            select: {
              id: true,
              title: true,
              brandId: true,
              brand: { select: { name: true } },
            },
          },
        },
      },
    },
    orderBy: { displayName: "asc" },
  });
}

export async function getAllBrandsWithBoards() {
  await requireSuperAdmin();

  return prisma.brand.findMany({
    where: { isArchived: false },
    select: {
      id: true,
      name: true,
      color: true,
      boards: {
        where: { isArchived: false },
        select: { id: true, title: true },
        orderBy: { title: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });
}

export async function assignUserToBrand(
  userId: string,
  brandId: string,
  role: "EDITOR" | "VIEWER" = "EDITOR"
) {
  await requireSuperAdmin();

  await prisma.brandMember.upsert({
    where: { brandId_userId: { brandId, userId } },
    create: { brandId, userId, role },
    update: { role },
  });

  revalidatePath("/admin/roles");
  return { success: true };
}

export async function removeUserFromBrand(userId: string, brandId: string) {
  await requireSuperAdmin();

  await prisma.brandMember.deleteMany({ where: { brandId, userId } });

  revalidatePath("/admin/roles");
  return { success: true };
}

export async function assignUserToBoard(
  userId: string,
  boardId: string,
  role: "EDITOR" | "VIEWER" = "EDITOR"
) {
  await requireSuperAdmin();

  await prisma.boardMember.upsert({
    where: { boardId_userId: { boardId, userId } },
    create: { boardId, userId, role },
    update: { role },
  });

  revalidatePath("/admin/roles");
  return { success: true };
}

export async function removeUserFromBoard(userId: string, boardId: string) {
  await requireSuperAdmin();

  await prisma.boardMember.deleteMany({ where: { boardId, userId } });

  revalidatePath("/admin/roles");
  return { success: true };
}
