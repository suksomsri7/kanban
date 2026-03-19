import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateOpenClaw, ocOk } from "@/lib/openclaw-auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ columnId: string }> }
) {
  const { columnId } = await params;
  const result = await authenticateOpenClaw(req, columnId);
  if (result.error) return result.error;
  const { ctx } = result;

  const column = await prisma.column.findUnique({
    where: { id: columnId },
    select: {
      id: true,
      title: true,
      boardId: true,
      board: {
        select: {
          id: true,
          title: true,
          columns: {
            orderBy: { order: "asc" },
            select: { id: true, title: true },
          },
          labels: { select: { id: true, name: true, color: true } },
        },
      },
      cards: {
        where: { isArchived: false },
        orderBy: { order: "asc" },
        select: {
          id: true,
          title: true,
          priority: true,
          dueDate: true,
          _count: { select: { subtasks: true, comments: true, attachments: true } },
          assignees: {
            include: { user: { select: { id: true, displayName: true, username: true } } },
          },
          labels: { include: { label: true } },
        },
      },
    },
  });

  if (!column) return ocOk({ error: "Column not found" });

  return ocOk({
    column: {
      id: column.id,
      title: column.title,
    },
    board: {
      id: column.board.id,
      title: column.board.title,
      columns: column.board.columns,
      labels: column.board.labels,
    },
    cards: column.cards,
    permissions: ctx.permissions,
  });
}
