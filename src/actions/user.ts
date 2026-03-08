"use server";

import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/password";
import { requireAuth, requireSuperAdmin } from "@/lib/auth-utils";
import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod/v4";
import type { SessionUser } from "@/types";

const RoleEnum = z.enum(["SUPER_ADMIN", "ADMIN", "USER", "GUEST"]);

const CreateUserSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(50)
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  displayName: z.string().min(1, "Display name is required").max(100),
  role: RoleEnum,
});

const UpdateUserSchema = z.object({
  id: z.string(),
  displayName: z.string().min(1).max(100).optional(),
  role: RoleEnum.optional(),
  isActive: z.boolean().optional(),
});

export async function getUsers() {
  await requireSuperAdmin();

  return prisma.user.findMany({
    select: {
      id: true,
      username: true,
      displayName: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createUser(formData: FormData) {
  await requireSuperAdmin();

  const raw = {
    username: formData.get("username") as string,
    password: formData.get("password") as string,
    displayName: formData.get("displayName") as string,
    role: formData.get("role") as Role,
  };

  const parsed = CreateUserSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const existing = await prisma.user.findUnique({
    where: { username: parsed.data.username },
  });

  if (existing) {
    return { error: "Username already exists" };
  }

  const passwordHash = await hashPassword(parsed.data.password);

  await prisma.user.create({
    data: {
      username: parsed.data.username,
      passwordHash,
      displayName: parsed.data.displayName,
      role: parsed.data.role,
    },
  });

  revalidatePath("/admin/users");
  return { success: true };
}

export async function updateUser(formData: FormData) {
  await requireSuperAdmin();

  const raw = {
    id: formData.get("id") as string,
    displayName: (formData.get("displayName") as string) || undefined,
    role: (formData.get("role") as Role) || undefined,
    isActive: formData.has("isActive")
      ? formData.get("isActive") === "true"
      : undefined,
  };

  const parsed = UpdateUserSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { id, ...data } = parsed.data;

  await prisma.user.update({
    where: { id },
    data,
  });

  revalidatePath("/admin/users");
  return { success: true };
}

export async function resetUserPassword(userId: string, newPassword: string) {
  await requireSuperAdmin();

  if (newPassword.length < 6) {
    return { error: "Password must be at least 6 characters" };
  }

  const passwordHash = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  return { success: true };
}

export async function changeOwnPassword(currentPassword: string, newPassword: string) {
  const session = await requireAuth();
  const user = session.user as SessionUser;

  if (newPassword.length < 6) {
    return { error: "New password must be at least 6 characters" };
  }

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) return { error: "User not found" };

  const valid = await verifyPassword(currentPassword, dbUser.passwordHash);
  if (!valid) return { error: "Current password is incorrect" };

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  return { success: true };
}

export async function deleteUser(userId: string): Promise<{ success?: boolean; error?: string }> {
  await requireSuperAdmin();

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });

    revalidatePath("/admin/users");
    return { success: true };
  } catch {
    return { error: "Failed to deactivate user" };
  }
}

export async function permanentlyDeleteUser(userId: string): Promise<{ success?: boolean; error?: string }> {
  await requireSuperAdmin();

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "User not found" };
  if (user.role === "SUPER_ADMIN") return { error: "Cannot delete a Super Admin" };

  const superAdmin = await prisma.user.findFirst({ where: { role: "SUPER_ADMIN" } });
  if (!superAdmin) return { error: "No Super Admin found to reassign ownership" };

  try {
    await prisma.$transaction(async (tx) => {
      await tx.board.updateMany({ where: { ownerId: userId }, data: { ownerId: superAdmin.id } });
      await tx.brand.updateMany({ where: { ownerId: userId }, data: { ownerId: superAdmin.id } });
      await tx.comment.deleteMany({ where: { authorId: userId } });
      await tx.cardAssignee.deleteMany({ where: { userId } });
      await tx.activityLog.deleteMany({ where: { userId } });
      await tx.attachment.deleteMany({ where: { uploadedBy: userId } });
      await tx.notification.deleteMany({ where: { userId } });
      await tx.boardMember.deleteMany({ where: { userId } });
      await tx.brandMember.deleteMany({ where: { userId } });
      await tx.user.delete({ where: { id: userId } });
    });

    revalidatePath("/admin/users");
    revalidatePath("/admin/roles");
    return { success: true };
  } catch {
    return { error: "Failed to delete user" };
  }
}
