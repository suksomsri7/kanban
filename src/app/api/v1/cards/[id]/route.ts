import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateApi, requireScope, requireAnyScope, jsonOk, jsonError } from "@/lib/api-auth";
import { logActivity } from "@/actions/activity";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await authenticateApi(req);
  if (result.error) return result.error;
  const scopeErr = requireScope(result.auth, "cards:read");
  if (scopeErr) return scopeErr;

  const { id } = await params;

  const card = await prisma.card.findUnique({
    where: { id },
    include: {
      column: { select: { id: true, title: true, boardId: true, board: { select: { id: true, title: true } } } },
      assignees: {
        include: { user: { select: { id: true, displayName: true, username: true, avatar: true } } },
      },
      labels: { include: { label: true } },
      comments: {
        include: { author: { select: { id: true, username: true, displayName: true, avatar: true } } },
        orderBy: { createdAt: "desc" },
      },
      attachments: {
        include: { uploader: { select: { id: true, displayName: true } } },
        orderBy: { createdAt: "desc" },
      },
      subtasks: { orderBy: { order: "asc" } },
      dependencies: { include: { blocking: { select: { id: true, title: true } } } },
      dependedBy: { include: { dependent: { select: { id: true, title: true } } } },
    },
  });

  if (!card) return jsonError("Card not found", 404);

  return jsonOk(card);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await authenticateApi(req);
  if (result.error) return result.error;
  const scopeErr = requireAnyScope(result.auth, ["cards:write", "cards:edit"]);
  if (scopeErr) return scopeErr;

  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body");
  }

  const existing = await prisma.card.findUnique({
    where: { id },
    select: { column: { select: { boardId: true } } },
  });
  if (!existing) return jsonError("Card not found", 404);

  const { title, description, priority, dueDate } = body as {
    title?: string;
    description?: string | null;
    priority?: string;
    dueDate?: string | null;
  };

  const data: Record<string, unknown> = {};
  if (title !== undefined) {
    if (!title.trim()) return jsonError("title cannot be empty");
    data.title = title.trim();
  }
  if (description !== undefined) data.description = description;
  if (priority !== undefined) {
    const valid = ["LOW", "MEDIUM", "HIGH", "URGENT"];
    if (!valid.includes(priority)) return jsonError(`priority must be one of: ${valid.join(", ")}`);
    data.priority = priority;
  }
  if (dueDate !== undefined) {
    data.dueDate = dueDate ? new Date(dueDate) : null;
  }

  if (Object.keys(data).length === 0) return jsonError("No fields to update");

  const card = await prisma.card.update({
    where: { id },
    data,
    include: {
      column: { select: { id: true, title: true, boardId: true } },
      assignees: { include: { user: { select: { id: true, displayName: true, username: true } } } },
      labels: { include: { label: true } },
      subtasks: { orderBy: { order: "asc" } },
    },
  });

  await logActivity("CARD_UPDATED", existing.column.boardId, result.auth.user.id, data, id);

  return jsonOk(card);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await authenticateApi(req);
  if (result.error) return result.error;
  const scopeErr = requireAnyScope(result.auth, ["cards:write", "cards:delete"]);
  if (scopeErr) return scopeErr;

  const { id } = await params;

  const card = await prisma.card.findUnique({
    where: { id },
    select: { title: true, column: { select: { boardId: true } } },
  });
  if (!card) return jsonError("Card not found", 404);

  await logActivity("CARD_DELETED", card.column.boardId, result.auth.user.id, { title: card.title });
  await prisma.card.delete({ where: { id } });

  return jsonOk({ deleted: true });
}
