import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateOpenClaw, requirePerm, ocOk, ocError } from "@/lib/openclaw-auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ columnId: string; cardId: string }> }
) {
  const { columnId, cardId } = await params;
  const result = await authenticateOpenClaw(req, columnId);
  if (result.error) return result.error;

  const card = await prisma.card.findFirst({
    where: { id: cardId, columnId, isArchived: false },
    include: {
      column: { select: { id: true, title: true } },
      assignees: { include: { user: { select: { id: true, displayName: true, username: true, avatar: true } } } },
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

  if (!card) return ocError("Card not found in this column", 404);

  return ocOk(card);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ columnId: string; cardId: string }> }
) {
  const { columnId, cardId } = await params;
  const result = await authenticateOpenClaw(req, columnId);
  if (result.error) return result.error;
  const { ctx } = result;

  const card = await prisma.card.findFirst({
    where: { id: cardId, columnId, isArchived: false },
    select: { id: true },
  });
  if (!card) return ocError("Card not found in this column", 404);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return ocError("Invalid JSON body");
  }

  const { title, description, priority, dueDate } = body as {
    title?: string;
    description?: string | null;
    priority?: string;
    dueDate?: string | null;
  };

  const data: Record<string, unknown> = {};
  if (title !== undefined) {
    const permErr = requirePerm(ctx, "canEditCardTitle");
    if (permErr) return permErr;
    if (!title.trim()) return ocError("title cannot be empty");
    data.title = title.trim();
  }
  if (description !== undefined) {
    const permErr = requirePerm(ctx, "canEditCardDescription");
    if (permErr) return permErr;
    data.description = description;
  }
  if (priority !== undefined) {
    const permErr = requirePerm(ctx, "canEditCardPriority");
    if (permErr) return permErr;
    const valid = ["LOW", "MEDIUM", "HIGH", "URGENT"];
    if (!valid.includes(priority)) return ocError(`priority must be one of: ${valid.join(", ")}`);
    data.priority = priority;
  }
  if (dueDate !== undefined) {
    const permErr = requirePerm(ctx, "canEditCardDueDate");
    if (permErr) return permErr;
    data.dueDate = dueDate ? new Date(dueDate) : null;
  }

  if (Object.keys(data).length === 0) return ocError("No fields to update");

  const updated = await prisma.card.update({
    where: { id: cardId },
    data,
    include: {
      column: { select: { id: true, title: true } },
      assignees: { include: { user: { select: { id: true, displayName: true, username: true } } } },
      labels: { include: { label: true } },
      subtasks: { orderBy: { order: "asc" } },
    },
  });

  return ocOk(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ columnId: string; cardId: string }> }
) {
  const { columnId, cardId } = await params;
  const result = await authenticateOpenClaw(req, columnId);
  if (result.error) return result.error;
  const { ctx } = result;

  const permErr = requirePerm(ctx, "canDeleteCard");
  if (permErr) return permErr;

  const card = await prisma.card.findFirst({
    where: { id: cardId, columnId, isArchived: false },
    select: { id: true },
  });
  if (!card) return ocError("Card not found in this column", 404);

  await prisma.card.delete({ where: { id: cardId } });

  return ocOk({ deleted: true });
}
