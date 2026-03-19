import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateOpenClaw, requirePerm, ocOk, ocError } from "@/lib/openclaw-auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ columnId: string; cardId: string; subtaskId: string }> }
) {
  const { columnId, cardId, subtaskId } = await params;
  const result = await authenticateOpenClaw(req, columnId);
  if (result.error) return result.error;
  const { ctx } = result;

  const permErr = requirePerm(ctx, "canManageSubtasks");
  if (permErr) return permErr;

  const card = await prisma.card.findFirst({
    where: { id: cardId, columnId, isArchived: false },
    select: { id: true },
  });
  if (!card) return ocError("Card not found in this column", 404);

  const existing = await prisma.subtask.findFirst({
    where: { id: subtaskId, cardId },
  });
  if (!existing) return ocError("Subtask not found", 404);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return ocError("Invalid JSON body");
  }

  const { title, isCompleted } = body as { title?: string; isCompleted?: boolean };
  const data: Record<string, unknown> = {};
  if (title !== undefined) {
    if (!title.trim()) return ocError("title cannot be empty");
    data.title = title.trim();
  }
  if (isCompleted !== undefined) data.isCompleted = !!isCompleted;

  if (Object.keys(data).length === 0) return ocError("No fields to update");

  const subtask = await prisma.subtask.update({ where: { id: subtaskId }, data });

  return ocOk(subtask);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ columnId: string; cardId: string; subtaskId: string }> }
) {
  const { columnId, cardId, subtaskId } = await params;
  const result = await authenticateOpenClaw(req, columnId);
  if (result.error) return result.error;
  const { ctx } = result;

  const permErr = requirePerm(ctx, "canManageSubtasks");
  if (permErr) return permErr;

  const card = await prisma.card.findFirst({
    where: { id: cardId, columnId, isArchived: false },
    select: { id: true },
  });
  if (!card) return ocError("Card not found in this column", 404);

  const existing = await prisma.subtask.findFirst({
    where: { id: subtaskId, cardId },
  });
  if (!existing) return ocError("Subtask not found", 404);

  await prisma.subtask.delete({ where: { id: subtaskId } });

  return ocOk({ deleted: true });
}
