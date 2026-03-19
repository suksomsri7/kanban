import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateOpenClaw, requirePerm, ocOk, ocError } from "@/lib/openclaw-auth";
import { generateKeyBetween } from "fractional-indexing";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ columnId: string; cardId: string }> }
) {
  const { columnId, cardId } = await params;
  const result = await authenticateOpenClaw(req, columnId);
  if (result.error) return result.error;

  const card = await prisma.card.findFirst({
    where: { id: cardId, columnId, isArchived: false },
    select: { id: true },
  });
  if (!card) return ocError("Card not found in this column", 404);

  const subtasks = await prisma.subtask.findMany({
    where: { cardId },
    orderBy: { order: "asc" },
  });

  return ocOk(subtasks);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ columnId: string; cardId: string }> }
) {
  const { columnId, cardId } = await params;
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

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return ocError("Invalid JSON body");
  }

  const { title } = body as { title?: string };
  if (!title?.trim()) return ocError("title is required");

  const lastSubtask = await prisma.subtask.findFirst({
    where: { cardId },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  const order = generateKeyBetween(lastSubtask?.order ?? null, null);

  const subtask = await prisma.subtask.create({
    data: { title: title.trim(), cardId, order },
  });

  return ocOk(subtask);
}
