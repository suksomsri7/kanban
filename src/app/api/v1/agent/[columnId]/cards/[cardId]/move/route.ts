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

  const permErr = requirePerm(ctx, "canMoveCard");
  if (permErr) return permErr;

  const card = await prisma.card.findFirst({
    where: { id: cardId, column: { boardId: ctx.column.boardId }, isArchived: false },
    select: { id: true, column: { select: { boardId: true } } },
  });
  if (!card) return ocError("Card not found in this board", 404);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return ocError("Invalid JSON body");
  }

  const { targetColumnId, position } = body as {
    targetColumnId?: string;
    position?: "top" | "bottom" | number;
  };

  if (!targetColumnId) return ocError("targetColumnId is required");

  const targetColumn = await prisma.column.findUnique({
    where: { id: targetColumnId },
    select: { boardId: true },
  });
  if (!targetColumn) return ocError("Target column not found", 404);
  if (targetColumn.boardId !== card.column.boardId)
    return ocError("Cannot move card to a different board via this endpoint");

  const cardsInColumn = await prisma.card.findMany({
    where: { columnId: targetColumnId, isArchived: false, id: { not: cardId } },
    orderBy: { order: "asc" },
    select: { order: true },
  });

  let newOrder: string;
  if (!position || position === "bottom" || cardsInColumn.length === 0) {
    newOrder = generateKeyBetween(cardsInColumn[cardsInColumn.length - 1]?.order ?? null, null);
  } else if (position === "top") {
    newOrder = generateKeyBetween(null, cardsInColumn[0]?.order ?? null);
  } else if (typeof position === "number") {
    const idx = Math.max(0, Math.min(position, cardsInColumn.length));
    const before = idx > 0 ? cardsInColumn[idx - 1].order : null;
    const after = idx < cardsInColumn.length ? cardsInColumn[idx].order : null;
    newOrder = generateKeyBetween(before, after);
  } else {
    newOrder = generateKeyBetween(cardsInColumn[cardsInColumn.length - 1]?.order ?? null, null);
  }

  const updated = await prisma.card.update({
    where: { id: cardId },
    data: { columnId: targetColumnId, order: newOrder },
    include: { column: { select: { id: true, title: true } } },
  });

  return ocOk(updated);
}
