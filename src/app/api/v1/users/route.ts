import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateApi, requireScope, jsonOk } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const result = await authenticateApi(req);
  if (result.error) return result.error;
  const scopeErr = requireScope(result.auth, "users:read");
  if (scopeErr) return scopeErr;

  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: {
      id: true,
      username: true,
      displayName: true,
      role: true,
      avatar: true,
      createdAt: true,
    },
    orderBy: { displayName: "asc" },
  });

  return jsonOk(users);
}
