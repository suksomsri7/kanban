"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-utils";
import { requireBoardPermission } from "@/lib/permissions";
import { randomBytes, createHash } from "crypto";
import type { SessionUser } from "@/types";

const AGENT_KEY_PREFIX = "agk_";

function generateAgentKey(): { rawKey: string; keyHash: string; keyPrefix: string } {
  const raw = randomBytes(32).toString("hex");
  const rawKey = `${AGENT_KEY_PREFIX}${raw}`;
  return {
    rawKey,
    keyHash: createHash("sha256").update(rawKey).digest("hex"),
    keyPrefix: rawKey.slice(0, 12),
  };
}

export async function listAgentKeys(columnId: string) {
  await requireAuth();
  const keys = await prisma.agentApiKey.findMany({
    where: { columnId },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      permissions: true,
      isActive: true,
      expiresAt: true,
      lastUsedAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
  return keys;
}

export async function createAgentKey(
  columnId: string,
  data: {
    name: string;
    permissions: Record<string, boolean>;
    expiresAt?: string | null;
  }
) {
  const session = await requireAuth();
  const user = session.user as SessionUser;

  const col = await prisma.column.findUnique({
    where: { id: columnId },
    select: { boardId: true },
  });
  if (!col) return { error: "Column not found" };

  const { allowed, error: permErr } = await requireBoardPermission(
    col.boardId, user.id, user.role, "canEditColumn"
  );
  if (!allowed) return { error: permErr || "Permission denied" };

  if (!data.name?.trim()) return { error: "Name is required" };

  const { rawKey, keyHash, keyPrefix } = generateAgentKey();

  const agentKey = await prisma.agentApiKey.create({
    data: {
      name: data.name.trim(),
      keyHash,
      keyPrefix,
      columnId,
      permissions: data.permissions || {},
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
    },
  });

  return {
    success: true,
    key: {
      id: agentKey.id,
      name: agentKey.name,
      rawKey,
      keyPrefix,
    },
  };
}

export async function deleteAgentKey(keyId: string) {
  const session = await requireAuth();
  const user = session.user as SessionUser;

  const agentKey = await prisma.agentApiKey.findUnique({
    where: { id: keyId },
    select: { columnId: true, column: { select: { boardId: true } } },
  });
  if (!agentKey) return { error: "Key not found" };

  const { allowed, error: permErr } = await requireBoardPermission(
    agentKey.column.boardId, user.id, user.role, "canEditColumn"
  );
  if (!allowed) return { error: permErr || "Permission denied" };

  await prisma.agentApiKey.delete({ where: { id: keyId } });
  return { success: true };
}

export async function toggleAgentKey(keyId: string, isActive: boolean) {
  const session = await requireAuth();
  const user = session.user as SessionUser;

  const agentKey = await prisma.agentApiKey.findUnique({
    where: { id: keyId },
    select: { columnId: true, column: { select: { boardId: true } } },
  });
  if (!agentKey) return { error: "Key not found" };

  const { allowed, error: permErr } = await requireBoardPermission(
    agentKey.column.boardId, user.id, user.role, "canEditColumn"
  );
  if (!allowed) return { error: permErr || "Permission denied" };

  await prisma.agentApiKey.update({
    where: { id: keyId },
    data: { isActive },
  });
  return { success: true };
}

export async function updateAgentKeyPermissions(keyId: string, permissions: Record<string, boolean>) {
  const session = await requireAuth();
  const user = session.user as SessionUser;

  const agentKey = await prisma.agentApiKey.findUnique({
    where: { id: keyId },
    select: { columnId: true, column: { select: { boardId: true } } },
  });
  if (!agentKey) return { error: "Key not found" };

  const { allowed, error: permErr } = await requireBoardPermission(
    agentKey.column.boardId, user.id, user.role, "canEditColumn"
  );
  if (!allowed) return { error: permErr || "Permission denied" };

  await prisma.agentApiKey.update({
    where: { id: keyId },
    data: { permissions },
  });
  return { success: true };
}

export async function regenerateAgentKey(keyId: string) {
  const session = await requireAuth();
  const user = session.user as SessionUser;

  const agentKey = await prisma.agentApiKey.findUnique({
    where: { id: keyId },
    select: { columnId: true, column: { select: { boardId: true } } },
  });
  if (!agentKey) return { error: "Key not found" };

  const { allowed, error: permErr } = await requireBoardPermission(
    agentKey.column.boardId, user.id, user.role, "canEditColumn"
  );
  if (!allowed) return { error: permErr || "Permission denied" };

  const { rawKey, keyHash, keyPrefix } = generateAgentKey();

  await prisma.agentApiKey.update({
    where: { id: keyId },
    data: { keyHash, keyPrefix },
  });

  return { success: true, rawKey, keyPrefix };
}
