"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth, requireSuperAdmin } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";
import { z } from "zod/v4";
import type { SessionUser } from "@/types";

const CreateBrandSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
  color: z.string().optional(),
});

const UpdateBrandSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  color: z.string().optional(),
});

export async function getBrands() {
  const session = await requireAuth();
  const user = session.user as SessionUser;

  if (user.role === "SUPER_ADMIN" || user.role === "ADMIN") {
    return prisma.brand.findMany({
      where: { isArchived: false },
      include: {
        owner: { select: { id: true, displayName: true, avatar: true } },
        members: {
          include: {
            user: { select: { id: true, displayName: true, avatar: true } },
          },
        },
        _count: { select: { boards: true } },
      },
      orderBy: { updatedAt: "desc" },
    });
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { customRoleId: true },
  });

  const customRoleBrandIds = dbUser?.customRoleId
    ? (await prisma.customRoleBoardAccess.findMany({
        where: { customRoleId: dbUser.customRoleId, canView: true },
        select: { board: { select: { brandId: true } } },
      }))
        .map((a) => a.board.brandId)
        .filter((id): id is string => id !== null)
    : [];

  return prisma.brand.findMany({
    where: {
      isArchived: false,
      OR: [
        { members: { some: { userId: user.id } } },
        ...(customRoleBrandIds.length > 0 ? [{ id: { in: customRoleBrandIds } }] : []),
      ],
    },
    include: {
      owner: { select: { id: true, displayName: true, avatar: true } },
      members: {
        include: {
          user: { select: { id: true, displayName: true, avatar: true } },
        },
      },
      _count: { select: { boards: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getBrandById(brandId: string) {
  const session = await requireAuth();
  const user = session.user as SessionUser;

  const brand = await prisma.brand.findUnique({
    where: { id: brandId },
    include: {
      owner: { select: { id: true, displayName: true, username: true, avatar: true } },
      members: {
        include: {
          user: { select: { id: true, displayName: true, username: true, avatar: true, role: true } },
        },
      },
      boards: {
        where: { isArchived: false },
        include: {
          owner: { select: { id: true, displayName: true } },
          members: {
            include: {
              user: { select: { id: true, displayName: true, avatar: true } },
            },
          },
          _count: { select: { columns: true } },
        },
        orderBy: { updatedAt: "desc" },
      },
    },
  });

  if (!brand) return null;

  if (user.role !== "SUPER_ADMIN" && user.role !== "ADMIN") {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { customRoleId: true },
    });

    const isMember = brand.members.some((m) => m.userId === user.id);

    if (dbUser?.customRoleId) {
      const accessibleBoardIds = (
        await prisma.customRoleBoardAccess.findMany({
          where: {
            customRoleId: dbUser.customRoleId,
            canView: true,
            board: { brandId },
          },
          select: { boardId: true },
        })
      ).map((a) => a.boardId);

      if (!isMember && accessibleBoardIds.length === 0) return null;

      brand.boards = brand.boards.filter((b) =>
        accessibleBoardIds.includes(b.id)
      );
    } else if (!isMember) {
      return null;
    }
  }

  return brand;
}

export async function createBrand(formData: FormData) {
  const session = await requireSuperAdmin();
  const user = session.user as SessionUser;

  const raw = {
    name: formData.get("name") as string,
    description: (formData.get("description") as string) || undefined,
    color: (formData.get("color") as string) || undefined,
  };

  const parsed = CreateBrandSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const brand = await prisma.brand.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      color: parsed.data.color || "#111827",
      ownerId: user.id,
      members: {
        create: { userId: user.id, role: "OWNER" },
      },
    },
  });

  revalidatePath("/brands");
  return { success: true, brandId: brand.id };
}

export async function updateBrand(formData: FormData) {
  await requireSuperAdmin();

  const raw = {
    id: formData.get("id") as string,
    name: (formData.get("name") as string) || undefined,
    description: formData.get("description") as string | undefined,
    color: (formData.get("color") as string) || undefined,
  };

  const parsed = UpdateBrandSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { id, ...data } = parsed.data;
  await prisma.brand.update({ where: { id }, data });

  revalidatePath("/brands");
  revalidatePath(`/brand/${id}`);
  return { success: true };
}

export async function deleteBrand(brandId: string) {
  await requireSuperAdmin();

  const attachments = await prisma.attachment.findMany({
    where: {
      card: { column: { board: { brandId } } },
    },
    select: { fileUrl: true },
  });

  if (attachments.length > 0) {
    try {
      const ftp = await import("basic-ftp");
      const client = new ftp.Client();
      client.ftp.verbose = false;
      await client.access({
        host: process.env.BUNNY_STORAGE_HOSTNAME!,
        user: process.env.BUNNY_STORAGE_USERNAME!,
        password: process.env.BUNNY_STORAGE_PASSWORD!,
        secure: false,
      });

      const cdnPrefix = `https://${process.env.BUNNY_STORAGE_USERNAME}.b-cdn.net`;
      for (const att of attachments) {
        try {
          const remotePath = att.fileUrl.replace(cdnPrefix, "");
          await client.remove(remotePath);
        } catch {
          // file may already be missing — continue
        }
      }

      const boardIds = await prisma.board.findMany({
        where: { brandId },
        select: { id: true, columns: { select: { cards: { select: { id: true } } } } },
      });
      const cardIds = boardIds.flatMap((b) =>
        b.columns.flatMap((c) => c.cards.map((card) => card.id))
      );
      for (const cardId of cardIds) {
        try {
          await client.removeDir(`/kanban/${cardId}`);
        } catch {
          // directory may not exist
        }
      }

      client.close();
    } catch (err) {
      console.error("Bunny CDN cleanup error (non-fatal):", err);
    }
  }

  await prisma.brand.delete({ where: { id: brandId } });

  revalidatePath("/");
  revalidatePath("/brands");
  return { success: true };
}

export async function addBrandMember(
  brandId: string,
  userId: string,
  role: "EDITOR" | "VIEWER" = "EDITOR"
) {
  await requireSuperAdmin();

  await prisma.brandMember.upsert({
    where: { brandId_userId: { brandId, userId } },
    create: { brandId, userId, role },
    update: { role },
  });

  revalidatePath(`/brand/${brandId}`);
  return { success: true };
}

export async function removeBrandMember(brandId: string, userId: string) {
  await requireSuperAdmin();

  await prisma.brandMember.deleteMany({
    where: { brandId, userId },
  });

  revalidatePath(`/brand/${brandId}`);
  return { success: true };
}
