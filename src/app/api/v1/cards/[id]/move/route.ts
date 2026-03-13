import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateApi, requireScope, jsonOk, jsonError } from "@/lib/api-auth";
import { generateKeyBetween } from "fractional-indexing";
import { logActivity } from "@/actions/activity";
import { triggerBoardEvent } from "@/lib/pusher-server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await authenticateApi(req);
  if (result.error) return result.error;
  const scopeErr = requireScope(result.auth, "cards:move");
  if (scopeErr) return scopeErr;

  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body");
  }

  const { columnId, position } = body as {
    columnId?: string;
    position?: "top" | "bottom" | number;
  };

  if (!columnId) return jsonError("columnId is required");

  const card = await prisma.card.findUnique({
    where: { id },
    select: { column: { select: { boardId: true } } },
  });
  if (!card) return jsonError("Card not found", 404);

  const targetColumn = await prisma.column.findUnique({
    where: { id: columnId },
    select: { boardId: true },
  });
  if (!targetColumn) return jsonError("Target column not found", 404);
  if (targetColumn.boardId !== card.column.boardId) return jsonError("Cannot move card to a different board");

  const cardsInColumn = await prisma.card.findMany({
    where: { columnId, isArchived: false, id: { not: id } },
    orderBy: { order: "asc" },
    select: { order: true },
  });

  let newOrder: string;
  if (!position || position === "bottom" || cardsInColumn.length === 0) {
    const lastOrder = cardsInColumn[cardsInColumn.length - 1]?.order ?? null;
    newOrder = generateKeyBetween(lastOrder, null);
  } else if (position === "top") {
    const firstOrder = cardsInColumn[0]?.order ?? null;
    newOrder = generateKeyBetween(null, firstOrder);
  } else if (typeof position === "number") {
    const idx = Math.max(0, Math.min(position, cardsInColumn.length));
    const before = idx > 0 ? cardsInColumn[idx - 1].order : null;
    const after = idx < cardsInColumn.length ? cardsInColumn[idx].order : null;
    newOrder = generateKeyBetween(before, after);
  } else {
    newOrder = generateKeyBetween(cardsInColumn[cardsInColumn.length - 1]?.order ?? null, null);
  }

  const updated = await prisma.card.update({
    where: { id },
    data: { columnId, order: newOrder },
    include: {
      column: { select: { id: true, title: true, boardId: true } },
    },
  });

  await logActivity("CARD_MOVED", card.column.boardId, result.auth.user.id, { columnId }, id);
  triggerBoardEvent(card.column.boardId, "card-moved", { cardId: id, columnId });

  return jsonOk(updated);
}
