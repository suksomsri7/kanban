import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateApi, jsonOk, jsonError } from "@/lib/api-auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateApi(req);
  if (auth.error) return auth.error;

  const { id } = await params;

  const board = await prisma.board.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, displayName: true, username: true, avatar: true } },
      brand: { select: { id: true, name: true, color: true } },
      members: {
        include: {
          user: { select: { id: true, displayName: true, username: true, avatar: true } },
        },
      },
      labels: { orderBy: { name: "asc" } },
      columns: {
        orderBy: { order: "asc" },
        include: {
          cards: {
            where: { isArchived: false },
            orderBy: { order: "asc" },
            include: {
              assignees: {
                include: {
                  user: { select: { id: true, displayName: true, username: true, avatar: true } },
                },
              },
              labels: { include: { label: true } },
              subtasks: { orderBy: { order: "asc" } },
              _count: { select: { comments: true, attachments: true } },
            },
          },
        },
      },
    },
  });

  if (!board) return jsonError("Board not found", 404);

  return jsonOk(board);
}
