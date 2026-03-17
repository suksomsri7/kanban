import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateApi, requireScope, jsonOk, jsonError } from "@/lib/api-auth";
import { generateKeyBetween } from "fractional-indexing";
import { logActivity } from "@/actions/activity";
import { triggerBoardEvent } from "@/lib/pusher-server";

export async function POST(req: NextRequest) {
  const result = await authenticateApi(req);
  if (result.error) return result.error;
  const scopeErr = requireScope(result.auth, "cards:write");
  if (scopeErr) return scopeErr;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body");
  }

  const { title, columnId, description, priority, dueDate, labelIds, assigneeIds, subtasks: subtaskTitles } = body as {
    title?: string;
    columnId?: string;
    description?: string;
    priority?: string;
    dueDate?: string | null;
    labelIds?: string[];
    assigneeIds?: string[];
    subtasks?: string[] | { title: string }[];
  };

  if (!title?.trim()) return jsonError("title is required");
  if (!columnId) return jsonError("columnId is required");

  const column = await prisma.column.findUnique({
    where: { id: columnId },
    select: { boardId: true },
  });
  if (!column) return jsonError("Column not found", 404);

  const lastCard = await prisma.card.findFirst({
    where: { columnId },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  const order = generateKeyBetween(lastCard?.order ?? null, null);

  const validPriorities = ["LOW", "MEDIUM", "HIGH", "URGENT"];
  const cardPriority = priority && validPriorities.includes(priority) ? priority : "MEDIUM";

  const card = await prisma.card.create({
    data: {
      title: title.trim(),
      columnId,
      order,
      description: description || null,
      priority: cardPriority as "LOW" | "MEDIUM" | "HIGH" | "URGENT",
      dueDate: dueDate ? new Date(dueDate) : null,
    },
  });

  if (labelIds && labelIds.length > 0) {
    const validLabels = await prisma.label.findMany({
      where: { id: { in: labelIds }, boardId: column.boardId },
      select: { id: true },
    });
    if (validLabels.length > 0) {
      await prisma.cardLabel.createMany({
        data: validLabels.map((l) => ({ cardId: card.id, labelId: l.id })),
      });
    }
  }

  if (assigneeIds && assigneeIds.length > 0) {
    const validUsers = await prisma.user.findMany({
      where: { id: { in: assigneeIds }, isActive: true },
      select: { id: true },
    });
    if (validUsers.length > 0) {
      await prisma.cardAssignee.createMany({
        data: validUsers.map((u) => ({ cardId: card.id, userId: u.id })),
      });
    }
  }

  if (subtaskTitles && Array.isArray(subtaskTitles) && subtaskTitles.length > 0) {
    const titles = subtaskTitles.map((s) => (typeof s === "string" ? s : s?.title)).filter((t): t is string => !!t?.trim());
    if (titles.length > 0) {
      let prevOrder: string | null = null;
      for (const t of titles) {
        const order = generateKeyBetween(prevOrder, null);
        await prisma.subtask.create({
          data: { title: t.trim(), cardId: card.id, order },
        });
        prevOrder = order;
      }
    }
  }

  await logActivity("CARD_CREATED", column.boardId, result.auth.user.id, { title: card.title }, card.id);
  triggerBoardEvent(column.boardId, "card-created", { cardId: card.id });

  const fullCard = await prisma.card.findUnique({
    where: { id: card.id },
    include: {
      column: { select: { id: true, title: true, boardId: true } },
      assignees: { include: { user: { select: { id: true, displayName: true, username: true } } } },
      labels: { include: { label: true } },
      subtasks: { orderBy: { order: "asc" } },
    },
  });

  return jsonOk(fullCard);
}

export async function GET(req: NextRequest) {
  const result = await authenticateApi(req);
  if (result.error) return result.error;
  const scopeErr = requireScope(result.auth, "cards:read");
  if (scopeErr) return scopeErr;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  const boardId = searchParams.get("boardId");
  const columnId = searchParams.get("columnId");
  const priority = searchParams.get("priority");
  const assigneeId = searchParams.get("assigneeId");
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);
  const offset = parseInt(searchParams.get("offset") || "0");

  const where: Record<string, unknown> = { isArchived: false };

  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];
  }
  if (boardId) where.column = { boardId };
  if (columnId) where.columnId = columnId;
  if (priority) where.priority = priority;
  if (assigneeId) where.assignees = { some: { userId: assigneeId } };

  const [cards, total] = await Promise.all([
    prisma.card.findMany({
      where,
      include: {
        column: { select: { id: true, title: true, boardId: true, board: { select: { title: true } } } },
        assignees: { include: { user: { select: { id: true, displayName: true, username: true } } } },
        labels: { include: { label: true } },
        _count: { select: { comments: true, attachments: true, subtasks: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.card.count({ where }),
  ]);

  return jsonOk({ cards, total, limit, offset });
}
