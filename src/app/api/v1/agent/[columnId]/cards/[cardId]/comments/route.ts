import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateOpenClaw, requirePerm, ocOk, ocError } from "@/lib/openclaw-auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ columnId: string; cardId: string }> }
) {
  const { columnId, cardId } = await params;
  const result = await authenticateOpenClaw(req, columnId);
  if (result.error) return result.error;
  const { ctx } = result;

  const card = await prisma.card.findFirst({
    where: { id: cardId, column: { boardId: ctx.column.boardId }, isArchived: false },
    select: { id: true },
  });
  if (!card) return ocError("Card not found in this board", 404);

  const comments = await prisma.comment.findMany({
    where: { cardId },
    include: {
      author: { select: { id: true, username: true, displayName: true, avatar: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return ocOk(comments);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ columnId: string; cardId: string }> }
) {
  const { columnId, cardId } = await params;
  const result = await authenticateOpenClaw(req, columnId);
  if (result.error) return result.error;
  const { ctx } = result;

  const permErr = requirePerm(ctx, "canComment");
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

  const { content, authorId } = body as { content?: string; authorId?: string };
  if (!content?.trim()) return ocError("content is required");

  const board = await prisma.board.findUnique({
    where: { id: ctx.column.boardId },
    select: { ownerId: true },
  });

  const comment = await prisma.comment.create({
    data: {
      content: content.trim(),
      cardId,
      authorId: authorId || board?.ownerId || "",
    },
    include: {
      author: { select: { id: true, username: true, displayName: true, avatar: true } },
    },
  });

  return ocOk(comment);
}
