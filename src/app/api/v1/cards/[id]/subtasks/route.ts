import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateApi, jsonOk, jsonError } from "@/lib/api-auth";
import { generateKeyBetween } from "fractional-indexing";

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

  const { title } = body as { title?: string };
  if (!title?.trim()) return jsonError("title is required");

  const card = await prisma.card.findUnique({ where: { id: cardId }, select: { id: true } });
  if (!card) return jsonError("Card not found", 404);

  const lastSubtask = await prisma.subtask.findFirst({
    where: { cardId },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const order = generateKeyBetween(lastSubtask?.order ?? null, null);

  const subtask = await prisma.subtask.create({
    data: { title: title.trim(), cardId, order },
  });

  return jsonOk(subtask);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateApi(req);
  if (auth.error) return auth.error;

  const { id: cardId } = await params;

  const subtasks = await prisma.subtask.findMany({
    where: { cardId },
    orderBy: { order: "asc" },
  });

  return jsonOk(subtasks);
}
