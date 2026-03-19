import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateOpenClaw, requirePerm, ocOk, ocError } from "@/lib/openclaw-auth";
import { generateKeyBetween } from "fractional-indexing";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ columnId: string; cardId: string }> }
) {
  const { columnId, cardId } = await params;
  const result = await authenticateOpenClaw(req, columnId);
  if (result.error) return result.error;
  const { ctx } = result;

  const permErr = requirePerm(ctx, "canDuplicateCard");
  if (permErr) return permErr;

  const source = await prisma.card.findFirst({
    where: { id: cardId, column: { boardId: ctx.column.boardId }, isArchived: false },
    include: {
      subtasks: { orderBy: { order: "asc" } },
      labels: true,
      assignees: true,
    },
  });
  if (!source) return ocError("Card not found in this board", 404);

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    /* no body is fine — duplicate in same column */
  }

  const targetColumnId = (body.targetColumnId as string) || columnId;

  const targetColumn = await prisma.column.findUnique({
    where: { id: targetColumnId },
    select: { boardId: true },
  });
  if (!targetColumn) return ocError("Target column not found", 404);
  if (targetColumn.boardId !== ctx.column.boardId)
    return ocError("Cannot duplicate to a different board via this endpoint");

  const lastCard = await prisma.card.findFirst({
    where: { columnId: targetColumnId },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  const order = generateKeyBetween(lastCard?.order ?? null, null);

  const newCard = await prisma.card.create({
    data: {
      title: `${source.title} (copy)`,
      description: source.description,
      priority: source.priority,
      dueDate: source.dueDate,
      columnId: targetColumnId,
      order,
      subtasks: source.subtasks.length > 0
        ? { create: source.subtasks.map((s) => ({ title: s.title, isCompleted: false, order: s.order })) }
        : undefined,
    },
    include: {
      column: { select: { id: true, title: true } },
      subtasks: { orderBy: { order: "asc" } },
    },
  });

  if (source.labels.length > 0) {
    await prisma.cardLabel.createMany({
      data: source.labels.map((l) => ({ cardId: newCard.id, labelId: l.labelId })),
    });
  }

  if (source.assignees.length > 0) {
    await prisma.cardAssignee.createMany({
      data: source.assignees.map((a) => ({ cardId: newCard.id, userId: a.userId })),
    });
  }

  const fullCard = await prisma.card.findUnique({
    where: { id: newCard.id },
    include: {
      column: { select: { id: true, title: true } },
      assignees: { include: { user: { select: { id: true, displayName: true, username: true } } } },
      labels: { include: { label: true } },
      subtasks: { orderBy: { order: "asc" } },
    },
  });

  return ocOk(fullCard);
}
