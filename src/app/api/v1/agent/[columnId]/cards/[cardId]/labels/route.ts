import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateOpenClaw, requirePerm, ocOk, ocError } from "@/lib/openclaw-auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ columnId: string; cardId: string }> }
) {
  const { columnId, cardId } = await params;
  const result = await authenticateOpenClaw(req, columnId);
  if (result.error) return result.error;
  const { ctx } = result;

  const permErr = requirePerm(ctx, "canEditCardLabels");
  if (permErr) return permErr;

  const card = await prisma.card.findFirst({
    where: { id: cardId, column: { boardId: ctx.column.boardId }, isArchived: false },
    select: { id: true },
  });
  if (!card) return ocError("Card not found in this board", 404);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return ocError("Invalid JSON body");
  }

  const { labelId } = body as { labelId?: string };
  if (!labelId) return ocError("labelId is required");

  const label = await prisma.label.findFirst({
    where: { id: labelId, boardId: ctx.column.boardId },
    select: { id: true },
  });
  if (!label) return ocError("Label not found in this board", 404);

  const existing = await prisma.cardLabel.findUnique({
    where: { cardId_labelId: { cardId, labelId } },
  });

  if (existing) {
    await prisma.cardLabel.delete({ where: { id: existing.id } });
    return ocOk({ action: "removed", cardId, labelId });
  }

  await prisma.cardLabel.create({ data: { cardId, labelId } });
  return ocOk({ action: "added", cardId, labelId });
}
