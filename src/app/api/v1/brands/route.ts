import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateApi, requireScope, jsonOk } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const result = await authenticateApi(req);
  if (result.error) return result.error;
  const scopeErr = requireScope(result.auth, "brands:read");
  if (scopeErr) return scopeErr;

  const brands = await prisma.brand.findMany({
    where: { isArchived: false },
    include: {
      owner: { select: { id: true, displayName: true, username: true } },
      members: {
        include: {
          user: { select: { id: true, displayName: true, username: true } },
        },
      },
      _count: { select: { boards: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return jsonOk(brands);
}
