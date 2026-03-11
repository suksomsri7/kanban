import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/types";

export interface ApiUser {
  id: string;
  username: string;
  displayName: string;
  role: "SUPER_ADMIN" | "ADMIN" | "USER" | "GUEST";
  avatar: string | null;
}

type AuthResult =
  | { user: ApiUser; error?: never }
  | { user?: never; error: NextResponse };

export async function authenticateApi(req: NextRequest): Promise<AuthResult> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return {
      error: NextResponse.json(
        { success: false, error: "Missing or invalid Authorization header. Use: Bearer <API_KEY>" },
        { status: 401 }
      ),
    };
  }

  const token = authHeader.slice(7);
  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    return {
      error: NextResponse.json(
        { success: false, error: "API_KEY not configured on the server" },
        { status: 500 }
      ),
    };
  }

  if (token !== apiKey) {
    return {
      error: NextResponse.json(
        { success: false, error: "Invalid API key" },
        { status: 401 }
      ),
    };
  }

  const agentUsername = process.env.API_AGENT_USERNAME || "admin";
  const user = await prisma.user.findUnique({
    where: { username: agentUsername },
    select: { id: true, username: true, displayName: true, role: true, avatar: true },
  });

  if (!user) {
    return {
      error: NextResponse.json(
        { success: false, error: `Agent user "${agentUsername}" not found` },
        { status: 500 }
      ),
    };
  }

  return { user: user as ApiUser };
}

export function jsonOk(data: unknown) {
  return NextResponse.json({ success: true, data });
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}
