import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export interface OpenClawContext {
  column: {
    id: string;
    title: string;
    boardId: string;
  };
  permissions: Record<string, boolean>;
}

type AuthResult =
  | { ctx: OpenClawContext; error?: never }
  | { ctx?: never; error: NextResponse };

export async function authenticateOpenClaw(
  req: NextRequest,
  columnId: string
): Promise<AuthResult> {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");

  if (!key) {
    return {
      error: NextResponse.json(
        { success: false, error: "Missing ?key= parameter" },
        { status: 401 }
      ),
    };
  }

  const column = await prisma.column.findUnique({
    where: { id: columnId },
    select: {
      id: true,
      title: true,
      boardId: true,
      automationType: true,
      openclawApiKey: true,
      openclawPermissions: true,
      automationStatus: true,
    },
  });

  if (!column) {
    return {
      error: NextResponse.json(
        { success: false, error: "Column not found" },
        { status: 404 }
      ),
    };
  }

  if (column.automationType !== "openclaw") {
    return {
      error: NextResponse.json(
        { success: false, error: "OpenClaw is not enabled for this column" },
        { status: 403 }
      ),
    };
  }

  if (column.automationStatus === "pause") {
    return {
      error: NextResponse.json(
        { success: false, error: "Automation is paused for this column" },
        { status: 403 }
      ),
    };
  }

  if (!column.openclawApiKey || column.openclawApiKey !== key) {
    return {
      error: NextResponse.json(
        { success: false, error: "Invalid API key" },
        { status: 401 }
      ),
    };
  }

  const permissions =
    column.openclawPermissions &&
    typeof column.openclawPermissions === "object" &&
    !Array.isArray(column.openclawPermissions)
      ? (column.openclawPermissions as Record<string, boolean>)
      : {};

  return {
    ctx: {
      column: { id: column.id, title: column.title, boardId: column.boardId },
      permissions,
    },
  };
}

export function requirePerm(
  ctx: OpenClawContext,
  perm: string
): NextResponse | null {
  if (ctx.permissions[perm]) return null;
  return NextResponse.json(
    { success: false, error: `Permission denied: ${perm}` },
    { status: 403 }
  );
}

export function ocOk(data: unknown) {
  return NextResponse.json({ success: true, data });
}

export function ocError(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}
