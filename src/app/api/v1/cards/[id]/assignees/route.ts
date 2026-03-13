import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateApi, requireScope, jsonOk, jsonError } from "@/lib/api-auth";
import { logActivity } from "@/actions/activity";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await authenticateApi(req);
  if (result.error) return result.error;
  const scopeErr = requireScope(result.auth, "cards:write");
  if (scopeErr) return scopeErr;

  const { id: cardId } = await params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body");
  }

  const { userId } = body as { userId?: string };
  if (!userId) return jsonError("userId is required");

  const card = await prisma.card.findUnique({
    where: { id: cardId },
    select: { column: { select: { boardId: true } } },
  });
  if (!card) return jsonError("Card not found", 404);

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) return jsonError("User not found", 404);

  const existing = await prisma.cardAssignee.findUnique({
    where: { cardId_userId: { cardId, userId } },
  });

  if (existing) {
    await prisma.cardAssignee.delete({ where: { id: existing.id } });
    await logActivity("CARD_UNASSIGNED", card.column.boardId, result.auth.user.id, { userId }, cardId);
    return jsonOk({ action: "removed", cardId, userId });
  }

  await prisma.cardAssignee.create({ data: { cardId, userId } });
  await logActivity("CARD_ASSIGNED", card.column.boardId, result.auth.user.id, { userId }, cardId);
  return jsonOk({ action: "added", cardId, userId });
}
