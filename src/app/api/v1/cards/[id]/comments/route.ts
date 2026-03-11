import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateApi, jsonOk, jsonError } from "@/lib/api-auth";
import { logActivity } from "@/actions/activity";
import { triggerBoardEvent } from "@/lib/pusher-server";

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

  const { content } = body as { content?: string };
  if (!content?.trim()) return jsonError("content is required");

  const card = await prisma.card.findUnique({
    where: { id: cardId },
    select: { column: { select: { boardId: true } } },
  });
  if (!card) return jsonError("Card not found", 404);

  const comment = await prisma.comment.create({
    data: {
      content: content.trim(),
      cardId,
      authorId: auth.user.id,
    },
    include: {
      author: { select: { id: true, displayName: true, avatar: true } },
    },
  });

  await logActivity("COMMENT_ADDED", card.column.boardId, auth.user.id, { preview: content.trim().slice(0, 80) }, cardId);
  triggerBoardEvent(card.column.boardId, "comment-added", { cardId });

  return jsonOk(comment);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateApi(req);
  if (auth.error) return auth.error;

  const { id: cardId } = await params;

  const comments = await prisma.comment.findMany({
    where: { cardId },
    include: {
      author: { select: { id: true, displayName: true, avatar: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return jsonOk(comments);
}
