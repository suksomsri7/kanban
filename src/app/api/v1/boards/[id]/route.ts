import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateApi, requireScope, requireAnyScope, jsonOk, jsonError } from "@/lib/api-auth";
import { logActivity } from "@/actions/activity";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await authenticateApi(req);
  if (result.error) return result.error;
  const scopeErr = requireScope(result.auth, "boards:read");
  if (scopeErr) return scopeErr;

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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
  const result = await authenticateApi(req);
  if (result.error) return result.error;
  const scopeErr = requireAnyScope(result.auth, ["boards:write", "boards:edit"]);
  if (scopeErr) return scopeErr;

  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body");
  }

  const existing = await prisma.board.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return jsonError("Board not found", 404);

  const { title, description, color } = body as {
    title?: string;
    description?: string | null;
    color?: string | null;
  };

  const data: Record<string, unknown> = {};
  if (title !== undefined) {
    if (!title.trim()) return jsonError("title cannot be empty");
    data.title = title.trim();
  }
  if (description !== undefined) data.description = description;
  if (color !== undefined) data.color = color;

  if (Object.keys(data).length === 0) return jsonError("No fields to update");

  const board = await prisma.board.update({
    where: { id },
    data,
    include: {
      owner: { select: { id: true, displayName: true, username: true } },
      brand: { select: { id: true, name: true, color: true } },
      columns: { orderBy: { order: "asc" }, select: { id: true, title: true, order: true } },
      labels: { select: { id: true, name: true, color: true } },
    },
  });

  try {
    await logActivity("BOARD_UPDATED", id, result.auth.user.id, data);
  } catch {
    // logActivity failure is non-critical
  }

  return jsonOk(board);
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: "Internal server error", detail: String(err) },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
  const result = await authenticateApi(req);
  if (result.error) return result.error;
  const scopeErr = requireAnyScope(result.auth, ["boards:write", "boards:delete"]);
  if (scopeErr) return scopeErr;

  const { id } = await params;

  const board = await prisma.board.findUnique({ where: { id }, select: { id: true, title: true } });
  if (!board) return jsonError("Board not found", 404);

  await prisma.board.update({ where: { id }, data: { isArchived: true } });

  try {
    await logActivity("BOARD_UPDATED", id, result.auth.user.id, { action: "archived", title: board.title });
  } catch {
    // logActivity failure is non-critical
  }

  return jsonOk({ deleted: true });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: "Internal server error", detail: String(err) },
      { status: 500 }
    );
  }
}
