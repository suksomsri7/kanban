import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateOpenClaw, requirePerm, ocOk, ocError } from "@/lib/openclaw-auth";
import { generateKeyBetween } from "fractional-indexing";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ columnId: string }> }
) {
  const { columnId } = await params;
  const result = await authenticateOpenClaw(req, columnId);
  if (result.error) return result.error;
  const { ctx } = result;

  const permErr = requirePerm(ctx, "canCreateCard");
  if (permErr) return permErr;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return ocError("Invalid JSON body");
  }

  const { title, description, priority, dueDate, labelIds, assigneeIds, subtasks: subtaskTitles } = body as {
    title?: string;
    description?: string;
    priority?: string;
    dueDate?: string | null;
    labelIds?: string[];
    assigneeIds?: string[];
    subtasks?: string[] | { title: string }[];
  };

  if (!title?.trim()) return ocError("title is required");

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
      where: { id: { in: labelIds }, boardId: ctx.column.boardId },
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
        const ord = generateKeyBetween(prevOrder, null);
        await prisma.subtask.create({ data: { title: t.trim(), cardId: card.id, order: ord } });
        prevOrder = ord;
      }
    }
  }

  const fullCard = await prisma.card.findUnique({
    where: { id: card.id },
    include: {
      column: { select: { id: true, title: true } },
      assignees: { include: { user: { select: { id: true, displayName: true, username: true } } } },
      labels: { include: { label: true } },
      subtasks: { orderBy: { order: "asc" } },
    },
  });

  return ocOk(fullCard);
}
