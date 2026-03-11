import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateApi, jsonOk } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const auth = await authenticateApi(req);
  if (auth.error) return auth.error;

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
