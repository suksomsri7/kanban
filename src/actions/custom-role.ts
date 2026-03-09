"use server";

import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";
import { z } from "zod/v4";

const CreateRoleSchema = z.object({
  name: z.string().min(1, "Name is required").max(50),
  description: z.string().max(200).optional(),
  color: z.string().optional(),
  canViewDashboard: z.boolean().default(true),
  canViewReports: z.boolean().default(false),
});

const BoardAccessSchema = z.object({
  customRoleId: z.string(),
  boardId: z.string(),
  canView: z.boolean().default(true),
  canDuplicateBoard: z.boolean().default(false),
  canCreateCard: z.boolean().default(false),
  canDeleteCard: z.boolean().default(false),
  canMoveCard: z.boolean().default(false),
  canEditCardTitle: z.boolean().default(false),
  canEditCardDescription: z.boolean().default(false),
  canEditCardPriority: z.boolean().default(false),
  canEditCardDueDate: z.boolean().default(false),
  canEditCardLabels: z.boolean().default(false),
  canManageLabels: z.boolean().default(false),
  canEditCardAssignees: z.boolean().default(false),
  canManageSubtasks: z.boolean().default(false),
  canUploadAttachment: z.boolean().default(false),
  canAddDependency: z.boolean().default(false),
  canComment: z.boolean().default(false),
  canLockCard: z.boolean().default(false),
  canAddColumn: z.boolean().default(false),
  canEditColumn: z.boolean().default(false),
  canDeleteColumn: z.boolean().default(false),
  allowedColumnIds: z.array(z.string()).default([]),
});

export async function getCustomRoles() {
  await requireSuperAdmin();

  return prisma.customRole.findMany({
    include: {
      _count: { select: { users: true } },
      boardAccess: {
        include: {
          board: {
            select: {
              id: true,
              title: true,
              brandId: true,
              brand: { select: { name: true } },
              columns: {
                select: { id: true, title: true, order: true },
                orderBy: { order: "asc" },
              },
            },
          },
        },
      },
      users: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatar: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });
}

export async function getAllBoardsWithColumns() {
  await requireSuperAdmin();

  return prisma.board.findMany({
    where: { isArchived: false },
    select: {
      id: true,
      title: true,
      brandId: true,
      brand: { select: { name: true } },
      columns: {
        select: { id: true, title: true, order: true },
        orderBy: { order: "asc" },
      },
    },
    orderBy: { title: "asc" },
  });
}

export async function getAllUsersForAssignment() {
  await requireSuperAdmin();

  return prisma.user.findMany({
    where: { isActive: true },
    select: {
      id: true,
      username: true,
      displayName: true,
      avatar: true,
      role: true,
      customRoleId: true,
    },
    orderBy: { displayName: "asc" },
  });
}

export async function createCustomRole(formData: FormData) {
  await requireSuperAdmin();

  const raw = {
    name: formData.get("name") as string,
    description: (formData.get("description") as string) || undefined,
    color: (formData.get("color") as string) || undefined,
    canViewDashboard: formData.get("canViewDashboard") === "true",
    canViewReports: formData.get("canViewReports") === "true",
  };

  const parsed = CreateRoleSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const existing = await prisma.customRole.findUnique({
    where: { name: parsed.data.name },
  });
  if (existing) return { error: "Role name already exists" };

  await prisma.customRole.create({ data: parsed.data });

  revalidatePath("/admin/roles");
  return { success: true };
}

export async function updateCustomRole(id: string, formData: FormData) {
  await requireSuperAdmin();

  const raw = {
    name: formData.get("name") as string,
    description: (formData.get("description") as string) || undefined,
    color: (formData.get("color") as string) || undefined,
    canViewDashboard: formData.get("canViewDashboard") === "true",
    canViewReports: formData.get("canViewReports") === "true",
  };

  const parsed = CreateRoleSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const existing = await prisma.customRole.findFirst({
    where: { name: parsed.data.name, NOT: { id } },
  });
  if (existing) return { error: "Role name already exists" };

  await prisma.customRole.update({ where: { id }, data: parsed.data });

  revalidatePath("/admin/roles");
  return { success: true };
}

export async function deleteCustomRole(id: string) {
  await requireSuperAdmin();

  await prisma.user.updateMany({
    where: { customRoleId: id },
    data: { customRoleId: null },
  });

  await prisma.customRole.delete({ where: { id } });

  revalidatePath("/admin/roles");
  return { success: true };
}

export async function setRoleBoardAccess(data: z.infer<typeof BoardAccessSchema>) {
  await requireSuperAdmin();

  const parsed = BoardAccessSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { customRoleId, boardId, allowedColumnIds, ...permissions } = parsed.data;

  await prisma.customRoleBoardAccess.upsert({
    where: { customRoleId_boardId: { customRoleId, boardId } },
    create: {
      customRoleId,
      boardId,
      ...permissions,
      allowedColumnIds: JSON.stringify(allowedColumnIds),
    },
    update: {
      ...permissions,
      allowedColumnIds: JSON.stringify(allowedColumnIds),
    },
  });

  revalidatePath("/admin/roles");
  return { success: true };
}

export async function removeRoleBoardAccess(customRoleId: string, boardId: string) {
  await requireSuperAdmin();

  await prisma.customRoleBoardAccess.deleteMany({
    where: { customRoleId, boardId },
  });

  revalidatePath("/admin/roles");
  return { success: true };
}

export async function assignUserCustomRole(userId: string, customRoleId: string | null) {
  await requireSuperAdmin();

  await prisma.user.update({
    where: { id: userId },
    data: { customRoleId },
  });

  revalidatePath("/admin/roles");
  revalidatePath("/admin/users");
  return { success: true };
}
