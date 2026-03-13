"use server";

import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/auth-utils";
import { generateApiKey, validateScopes, type ApiKeyScope } from "@/lib/api-key";
import { revalidatePath } from "next/cache";

export async function getApiKeys() {
  await requireSuperAdmin();

  return prisma.apiKey.findMany({
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      scopes: true,
      isActive: true,
      lastUsedAt: true,
      expiresAt: true,
      createdAt: true,
      user: {
        select: { id: true, username: true, displayName: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createApiKey(data: {
  name: string;
  userId: string;
  scopes: string[];
  expiresAt?: string | null;
}): Promise<{ success: boolean; rawKey?: string; error?: string }> {
  await requireSuperAdmin();

  if (!data.name?.trim()) {
    return { success: false, error: "Name is required" };
  }
  if (!data.userId) {
    return { success: false, error: "User is required" };
  }

  const user = await prisma.user.findUnique({
    where: { id: data.userId },
    select: { id: true, isActive: true },
  });

  if (!user || !user.isActive) {
    return { success: false, error: "User not found or inactive" };
  }

  const scopes = validateScopes(data.scopes);
  if (scopes.length === 0) {
    return { success: false, error: "At least one scope is required" };
  }

  const { rawKey, keyHash, keyPrefix } = generateApiKey();

  await prisma.apiKey.create({
    data: {
      name: data.name.trim(),
      keyHash,
      keyPrefix,
      scopes: scopes as unknown as ApiKeyScope[],
      userId: data.userId,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
    },
  });

  revalidatePath("/admin/api-keys");

  return { success: true, rawKey };
}

export async function deleteApiKey(id: string): Promise<{ success: boolean; error?: string }> {
  await requireSuperAdmin();

  const key = await prisma.apiKey.findUnique({ where: { id } });
  if (!key) {
    return { success: false, error: "API key not found" };
  }

  await prisma.apiKey.delete({ where: { id } });
  revalidatePath("/admin/api-keys");

  return { success: true };
}

export async function toggleApiKey(id: string): Promise<{ success: boolean; error?: string }> {
  await requireSuperAdmin();

  const key = await prisma.apiKey.findUnique({ where: { id }, select: { isActive: true } });
  if (!key) {
    return { success: false, error: "API key not found" };
  }

  await prisma.apiKey.update({
    where: { id },
    data: { isActive: !key.isActive },
  });

  revalidatePath("/admin/api-keys");

  return { success: true };
}

export async function updateApiKeyScopes(
  id: string,
  scopes: string[]
): Promise<{ success: boolean; error?: string }> {
  await requireSuperAdmin();

  const key = await prisma.apiKey.findUnique({ where: { id } });
  if (!key) {
    return { success: false, error: "API key not found" };
  }

  const validScopes = validateScopes(scopes);
  if (validScopes.length === 0) {
    return { success: false, error: "At least one scope is required" };
  }

  await prisma.apiKey.update({
    where: { id },
    data: { scopes: validScopes as unknown as ApiKeyScope[] },
  });

  revalidatePath("/admin/api-keys");

  return { success: true };
}

export async function getActiveUsersForApiKey() {
  await requireSuperAdmin();

  return prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, username: true, displayName: true, role: true },
    orderBy: { displayName: "asc" },
  });
}
