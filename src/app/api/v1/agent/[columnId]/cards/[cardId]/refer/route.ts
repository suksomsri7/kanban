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

  const permErr = requirePerm(ctx, "canReferCard");
  if (permErr) return permErr;

  const card = await prisma.card.findFirst({
    where: { id: cardId, columnId, isArchived: false },
    select: { id: true, title: true, column: { select: { boardId: true } } },
  });
  if (!card) return ocError("Card not found in this column", 404);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return ocError("Invalid JSON body");
  }

  const { targetColumnId } = body as { targetColumnId?: string };
  if (!targetColumnId) return ocError("targetColumnId is required");

  const targetColumn = await prisma.column.findUnique({
    where: { id: targetColumnId },
    select: { boardId: true },
  });
  if (!targetColumn) return ocError("Target column not found", 404);
  if (targetColumn.boardId === card.column.boardId)
    return ocError("Cannot refer card to same board — use move instead");

  const existing = await prisma.cardRef.findUnique({
    where: { cardId_columnId: { cardId, columnId: targetColumnId } },
  });
  if (existing) return ocError("Card already referred to this column");

  const lastCard = await prisma.card.findFirst({
    where: { columnId: targetColumnId },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  const lastRef = await prisma.cardRef.findFirst({
    where: { columnId: targetColumnId },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  const maxOrder = [lastCard?.order, lastRef?.order].filter(Boolean).sort().pop();
  const newOrder = generateKeyBetween(maxOrder ?? null, null);

  const ref = await prisma.cardRef.create({
    data: { cardId, columnId: targetColumnId, order: newOrder },
  });

  return ocOk({ referred: true, cardRefId: ref.id, cardId, targetColumnId });
}
