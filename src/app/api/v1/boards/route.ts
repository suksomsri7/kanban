import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateApi, requireScope, jsonOk } from "@/lib/api-auth";

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
