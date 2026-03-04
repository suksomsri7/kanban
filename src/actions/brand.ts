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

  if (user.role === "SUPER_ADMIN") {
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

  return prisma.brand.findMany({
    where: {
      isArchived: false,
      members: { some: { userId: user.id } },
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

  if (user.role !== "SUPER_ADMIN") {
    const isMember = brand.members.some((m) => m.userId === user.id);
    if (!isMember) return null;
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

  await prisma.brand.update({
    where: { id: brandId },
    data: { isArchived: true },
  });

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
