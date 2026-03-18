import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateApi, requireScope, requireAnyScope, jsonOk, jsonError } from "@/lib/api-auth";
import { logActivity } from "@/actions/activity";

export async function GET(req: NextRequest) {
  const result = await authenticateApi(req);
  if (result.error) return result.error;
  const scopeErr = requireScope(result.auth, "boards:read");
  if (scopeErr) return scopeErr;

  const boards = await prisma.board.findMany({
    where: { isArchived: false },
    include: {
      owner: { select: { id: true, displayName: true, username: true } },
      brand: { select: { id: true, name: true, color: true } },
      columns: {
        orderBy: { order: "asc" },
        select: { id: true, title: true, order: true },
      },
      labels: { select: { id: true, name: true, color: true } },
      members: {
        include: {
          user: { select: { id: true, displayName: true, username: true } },
        },
      },
      _count: { select: { columns: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return jsonOk(boards);
}

export async function POST(req: NextRequest) {
  try {
  const result = await authenticateApi(req);
  if (result.error) return result.error;
  const scopeErr = requireAnyScope(result.auth, ["boards:write", "boards:create"]);
  if (scopeErr) return scopeErr;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body");
  }

  const { title, description, brandId, columns: customColumns } = body as {
    title?: string;
    description?: string;
    brandId?: string;
    columns?: string[];
  };

  if (!title?.trim()) return jsonError("title is required");

  if (brandId) {
    const brand = await prisma.brand.findUnique({ where: { id: brandId }, select: { id: true } });
    if (!brand) return jsonError("Brand not found", 404);
  }

  const defaultColumns = [
    { title: "To Do", order: "a0", color: null },
    { title: "In Progress", order: "a1", color: null },
    { title: "Done", order: "a2", color: null },
  ];

  let columnsToCreate = defaultColumns;
  if (customColumns && Array.isArray(customColumns) && customColumns.length > 0) {
    columnsToCreate = customColumns
      .filter((c): c is string => typeof c === "string" && !!c.trim())
      .map((c, i) => ({ title: c.trim(), order: `a${i}`, color: null }));
  }

  const board = await prisma.board.create({
    data: {
      title: title.trim(),
      description: description || null,
      ownerId: result.auth.user.id,
      brandId: brandId || null,
      members: {
        create: { userId: result.auth.user.id, role: "OWNER" },
      },
      columns: {
        create: columnsToCreate.map((c) => ({
          title: c.title,
          order: c.order,
          color: c.color,
        })),
      },
    },
    include: {
      owner: { select: { id: true, displayName: true, username: true } },
      brand: { select: { id: true, name: true, color: true } },
      columns: { orderBy: { order: "asc" }, select: { id: true, title: true, order: true } },
      members: { include: { user: { select: { id: true, displayName: true, username: true } } } },
    },
  });

  try {
    await logActivity("BOARD_CREATED", board.id, result.auth.user.id, { title: board.title });
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
