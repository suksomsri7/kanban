import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateApi, jsonOk, jsonError } from "@/lib/api-auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateApi(req);
  if (auth.error) return auth.error;

  const { id: cardId } = await params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body");
  }

  const { labelId } = body as { labelId?: string };
  if (!labelId) return jsonError("labelId is required");

  const card = await prisma.card.findUnique({ where: { id: cardId }, select: { id: true } });
  if (!card) return jsonError("Card not found", 404);

  const label = await prisma.label.findUnique({ where: { id: labelId }, select: { id: true } });
  if (!label) return jsonError("Label not found", 404);

  const existing = await prisma.cardLabel.findUnique({
    where: { cardId_labelId: { cardId, labelId } },
  });

  if (existing) {
    await prisma.cardLabel.delete({ where: { id: existing.id } });
    return jsonOk({ action: "removed", cardId, labelId });
  }

  await prisma.cardLabel.create({ data: { cardId, labelId } });
  return jsonOk({ action: "added", cardId, labelId });
}
