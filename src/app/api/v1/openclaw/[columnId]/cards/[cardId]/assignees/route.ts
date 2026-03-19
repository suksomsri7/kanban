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

  const permErr = requirePerm(ctx, "canEditCardAssignees");
  if (permErr) return permErr;

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

  const { userId } = body as { userId?: string };
  if (!userId) return ocError("userId is required");

  const user = await prisma.user.findUnique({
    where: { id: userId, isActive: true },
    select: { id: true },
  });
  if (!user) return ocError("User not found", 404);

  const existing = await prisma.cardAssignee.findUnique({
    where: { cardId_userId: { cardId, userId } },
  });

  if (existing) {
    await prisma.cardAssignee.delete({ where: { id: existing.id } });
    return ocOk({ action: "removed", cardId, userId });
  }

  await prisma.cardAssignee.create({ data: { cardId, userId } });
  return ocOk({ action: "added", cardId, userId });
}
