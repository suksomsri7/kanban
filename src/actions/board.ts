"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth, requireAdmin } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";
import { z } from "zod/v4";
import type { SessionUser } from "@/types";
import { logActivity } from "@/actions/activity";
import { requireBoardPermission } from "@/lib/permissions";

const CreateBoardSchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  description: z.string().max(500).optional(),
  templateId: z.string().optional(),
  brandId: z.string().optional(),
});

const UpdateBoardSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  color: z.string().optional(),
});

export async function getBoards() {
  const session = await requireAuth();
  const user = session.user as SessionUser;

  if (user.role === "SUPER_ADMIN" || user.role === "ADMIN") {
    return prisma.board.findMany({
      where: { isArchived: false },
      include: {
        owner: { select: { id: true, displayName: true, username: true } },
        members: {
          include: {
            user: { select: { id: true, displayName: true, avatar: true } },
          },
        },
        columns: { select: { id: true } },
        _count: { select: { columns: true } },
      },
      orderBy: { updatedAt: "desc" },
    });
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { customRoleId: true },
  });

  const customRoleBoardIds = dbUser?.customRoleId
    ? (await prisma.customRoleBoardAccess.findMany({
        where: { customRoleId: dbUser.customRoleId, canView: true },
        select: { boardId: true },
      })).map((a) => a.boardId)
    : [];

  return prisma.board.findMany({
    where: {
      isArchived: false,
      OR: [
        { ownerId: user.id },
        { members: { some: { userId: user.id } } },
        { brand: { members: { some: { userId: user.id } } } },
        ...(customRoleBoardIds.length > 0 ? [{ id: { in: customRoleBoardIds } }] : []),
      ],
    },
    include: {
      owner: { select: { id: true, displayName: true, username: true } },
      members: {
        include: {
          user: { select: { id: true, displayName: true, avatar: true } },
        },
      },
      _count: { select: { columns: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getBoardById(boardId: string) {
  const session = await requireAuth();
  const user = session.user as SessionUser;

  if (user.role !== "SUPER_ADMIN" && user.role !== "ADMIN") {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { customRoleId: true },
    });

    const board = await prisma.board.findUnique({
      where: { id: boardId },
      select: {
        ownerId: true,
        members: { select: { userId: true } },
        brand: { select: { members: { select: { userId: true } } } },
      },
    });

    if (!board) return null;

    const isOwner = board.ownerId === user.id;
    const isMember = board.members.some((m) => m.userId === user.id);
    const isBrandMember = board.brand?.members.some((m) => m.userId === user.id);
    const hasCustomRoleAccess = dbUser?.customRoleId
      ? !!(await prisma.customRoleBoardAccess.findUnique({
          where: { customRoleId_boardId: { customRoleId: dbUser.customRoleId, boardId } },
          select: { canView: true },
        }))?.canView
      : false;

    if (!isOwner && !isMember && !isBrandMember && !hasCustomRoleAccess) {
      return null;
    }
  }

  return prisma.board.findUnique({
    where: { id: boardId },
    include: {
      owner: { select: { id: true, displayName: true, username: true, avatar: true } },
      members: {
        include: {
          user: { select: { id: true, displayName: true, username: true, avatar: true } },
        },
      },
      labels: { orderBy: { name: "asc" } },
      columns: {
        orderBy: { order: "asc" },
        include: {
          cards: {
            where: { isArchived: false },
            orderBy: { order: "asc" },
            include: {
              assignees: {
                include: {
                  user: { select: { id: true, displayName: true, avatar: true } },
                },
              },
              labels: { include: { label: true } },
              _count: { select: { comments: true, attachments: true, subtasks: true } },
            },
          },
        },
      },
    },
  });
}

export async function createBoard(formData: FormData) {
  const session = await requireAdmin();
  const user = session.user as SessionUser;

  const raw = {
    title: formData.get("title") as string,
    description: (formData.get("description") as string) || undefined,
    templateId: (formData.get("templateId") as string) || undefined,
    brandId: (formData.get("brandId") as string) || undefined,
  };

  const parsed = CreateBoardSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  let templateColumns: { title: string; order: string; color: string | null }[] = [];
  let templateLabels: { name: string; color: string }[] = [];

  if (parsed.data.templateId) {
    const template = await prisma.boardTemplate.findUnique({
      where: { id: parsed.data.templateId },
    });
    if (template) {
      templateColumns = template.columns as typeof templateColumns;
      templateLabels = template.labels as typeof templateLabels;
    }
  }

  if (templateColumns.length === 0) {
    templateColumns = [
      { title: "To Do", order: "a0", color: null },
      { title: "In Progress", order: "a1", color: null },
      { title: "Done", order: "a2", color: null },
    ];
  }

  

  const board = await prisma.board.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      ownerId: user.id,
      brandId: parsed.data.brandId || null,
      members: {
        create: { userId: user.id, role: "OWNER" },
      },
      columns: {
        create: templateColumns.map((c) => ({
          title: c.title,
          order: c.order,
          color: c.color,
        })),
      },
      labels: {
        create: templateLabels.map((l) => ({
          name: l.name,
          color: l.color,
        })),
      },
    },
  });

  await logActivity("BOARD_CREATED", board.id, user.id, { title: parsed.data.title });

  if (parsed.data.brandId) {
    revalidatePath(`/brand/${parsed.data.brandId}/boards`);
  }
  return { success: true, boardId: board.id };
}

export async function updateBoard(formData: FormData) {
  const session = await requireAuth();
  const user = session.user as SessionUser;

  const raw = {
    id: formData.get("id") as string,
    title: (formData.get("title") as string) || undefined,
    description: (formData.get("description") as string | null) ?? undefined,
    color: (formData.get("color") as string) || undefined,
  };

  const parsed = UpdateBoardSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { id, ...data } = parsed.data;

  if (data.color && user.role !== "SUPER_ADMIN") {
    return { error: "Only Super Admin can change board color" };
  }

  if (data.title && user.role !== "SUPER_ADMIN" && user.role !== "ADMIN") {
    const { allowed } = await requireBoardPermission(id, user.id, user.role);
    if (!allowed) return { error: "Permission denied" };
  }

  if (data.description !== undefined) {
    const { allowed } = await requireBoardPermission(id, user.id, user.role, "canEditBoardDescription");
    if (!allowed) return { error: "Permission denied: canEditBoardDescription" };
  }

  const updatedBoard = await prisma.board.update({ where: { id }, data });
  await logActivity("BOARD_UPDATED", id, user.id, { ...data });

  if (updatedBoard.brandId) {
    revalidatePath(`/brand/${updatedBoard.brandId}/boards`);
  }
  revalidatePath(`/board/${id}`);
  return { success: true };
}

export async function deleteBoard(boardId: string) {
  await requireAdmin();

  const board = await prisma.board.update({
    where: { id: boardId },
    data: { isArchived: true },
  });

  if (board.brandId) {
    revalidatePath(`/brand/${board.brandId}/boards`);
  }
  return { success: true };
}

export async function addBoardMember(boardId: string, userId: string, role: "EDITOR" | "VIEWER" = "EDITOR") {
  const session = await requireAdmin();
  const currentUser = session.user as SessionUser;

  await prisma.boardMember.upsert({
    where: { boardId_userId: { boardId, userId } },
    create: { boardId, userId, role },
    update: { role },
  });

  await logActivity("MEMBER_ADDED", boardId, currentUser.id, { userId, role });

  revalidatePath(`/board/${boardId}`);
  return { success: true };
}

export async function removeBoardMember(boardId: string, userId: string) {
  const session = await requireAdmin();
  const currentUser = session.user as SessionUser;

  await prisma.boardMember.deleteMany({
    where: { boardId, userId },
  });

  await logActivity("MEMBER_REMOVED", boardId, currentUser.id, { userId });

  revalidatePath(`/board/${boardId}`);
  return { success: true };
}

export async function duplicateBoard(boardId: string) {
  const session = await requireAuth();
  const user = session.user as SessionUser;

  const { allowed, error: permErr } = await requireBoardPermission(boardId, user.id, user.role, "canDuplicateBoard");
  if (!allowed) return { error: permErr || "Permission denied" };

  const source = await prisma.board.findUnique({
    where: { id: boardId },
    include: {
      columns: {
        orderBy: { order: "asc" },
        include: {
          cards: {
            where: { isArchived: false },
            orderBy: { order: "asc" },
            include: {
              labels: { select: { labelId: true } },
              subtasks: { orderBy: { order: "asc" } },
            },
          },
        },
      },
      labels: true,
    },
  });

  if (!source) return { error: "Board not found" };

  const newBoard = await prisma.board.create({
    data: {
      title: `${source.title} (Copy)`,
      description: source.description,
      color: source.color,
      ownerId: user.id,
      brandId: source.brandId,
      members: { create: { userId: user.id, role: "OWNER" } },
    },
  });

  const labelMap = new Map<string, string>();
  for (const label of source.labels) {
    const newLabel = await prisma.label.create({
      data: { name: label.name, color: label.color, boardId: newBoard.id },
    });
    labelMap.set(label.id, newLabel.id);
  }

  for (const col of source.columns) {
    const newCol = await prisma.column.create({
      data: {
        title: col.title,
        order: col.order,
        color: col.color,
        boardId: newBoard.id,
      },
    });

    for (const card of col.cards) {
      const newCard = await prisma.card.create({
        data: {
          title: card.title,
          description: card.description,
          order: card.order,
          priority: card.priority,
          dueDate: card.dueDate,
          columnId: newCol.id,
        },
      });

      const newLabelIds = card.labels
        .map((cl) => labelMap.get(cl.labelId))
        .filter(Boolean) as string[];
      if (newLabelIds.length > 0) {
        await prisma.cardLabel.createMany({
          data: newLabelIds.map((labelId) => ({ cardId: newCard.id, labelId })),
        });
      }

      if (card.subtasks.length > 0) {
        await prisma.subtask.createMany({
          data: card.subtasks.map((st) => ({
            title: st.title,
            isCompleted: false,
            order: st.order,
            cardId: newCard.id,
          })),
        });
      }
    }
  }

  if (source.brandId) {
    revalidatePath(`/brand/${source.brandId}/boards`);
  }
  return { success: true, boardId: newBoard.id };
}

export async function getBoardTemplates() {
  return prisma.boardTemplate.findMany({ orderBy: { name: "asc" } });
}
