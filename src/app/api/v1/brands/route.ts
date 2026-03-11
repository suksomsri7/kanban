import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateApi, jsonOk } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const auth = await authenticateApi(req);
  if (auth.error) return auth.error;

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
