import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";

export interface OpenClawContext {
  column: {
    id: string;
    title: string;
    boardId: string;
  };
  permissions: Record<string, boolean>;
  agentKeyName: string | null;
  agentKeyId: string | null;
}

type AuthResult =
  | { ctx: OpenClawContext; error?: never }
  | { ctx?: never; error: NextResponse };

export async function authenticateOpenClaw(
  req: NextRequest,
  columnId: string,
  options?: { allowPaused?: boolean }
): Promise<AuthResult> {
  const key =
    req.headers.get("x-api-key") ||
    new URL(req.url).searchParams.get("key");

  if (!key) {
    return {
      error: NextResponse.json(
        { success: false, error: "Missing x-api-key header" },
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
        { success: false, error: "Agent is not enabled for this column" },
        { status: 403 }
      ),
    };
  }

  if (column.automationStatus === "pause" && !options?.allowPaused) {
    return {
      error: NextResponse.json(
        { success: false, error: "Automation is paused for this column" },
        { status: 403 }
      ),
    };
  }

  const keyHash = createHash("sha256").update(key).digest("hex");
  const agentKey = await prisma.agentApiKey.findUnique({
    where: { keyHash },
    select: {
      id: true,
      name: true,
      columnId: true,
      permissions: true,
      isActive: true,
      expiresAt: true,
    },
  });

  // #region agent log
  console.log('[DEBUG-3e7644] Agent API auth lookup',JSON.stringify({keyPrefix:key.slice(0,12),agentKeyFound:!!agentKey,agentKeyColumnId:agentKey?.columnId||null,requestedColumnId:columnId,columnMatch:agentKey?agentKey.columnId===columnId:false,isActive:agentKey?.isActive??null,expiresAt:agentKey?.expiresAt?.toISOString()??null,automationType:column.automationType}));
  fetch('http://127.0.0.1:7492/ingest/8743131b-3026-4056-b195-fc1daa1be99f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'3e7644'},body:JSON.stringify({sessionId:'3e7644',location:'openclaw-auth.ts:authenticateOpenClaw',message:'Agent API auth lookup',data:{keyPrefix:key.slice(0,12),keyHashPrefix:keyHash.slice(0,12),agentKeyFound:!!agentKey,agentKeyColumnId:agentKey?.columnId||null,requestedColumnId:columnId,columnMatch:agentKey?agentKey.columnId===columnId:false,isActive:agentKey?.isActive??null,expiresAt:agentKey?.expiresAt?.toISOString()??null,columnAutomationType:column.automationType,columnAutomationStatus:column.automationStatus},timestamp:Date.now(),hypothesisId:'H2,H3,H4,H5'})}).catch(()=>{});
  // #endregion

  if (agentKey && agentKey.columnId === columnId) {
    if (!agentKey.isActive) {
      return {
        error: NextResponse.json(
          { success: false, error: "API key is disabled" },
          { status: 401 }
        ),
      };
    }
    if (agentKey.expiresAt && agentKey.expiresAt < new Date()) {
      return {
        error: NextResponse.json(
          { success: false, error: "API key has expired" },
          { status: 401 }
        ),
      };
    }

    prisma.agentApiKey.update({
      where: { id: agentKey.id },
      data: { lastUsedAt: new Date() },
    }).catch(() => {});

    const permissions =
      agentKey.permissions &&
      typeof agentKey.permissions === "object" &&
      !Array.isArray(agentKey.permissions)
        ? (agentKey.permissions as Record<string, boolean>)
        : {};

    return {
      ctx: {
        column: { id: column.id, title: column.title, boardId: column.boardId },
        permissions,
        agentKeyName: agentKey.name,
        agentKeyId: agentKey.id,
      },
    };
  }

  // Fallback: legacy single key on column (backward compat)
  if (column.openclawApiKey && column.openclawApiKey === key) {
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
        agentKeyName: null,
        agentKeyId: null,
      },
    };
  }

  return {
    error: NextResponse.json(
      { success: false, error: "Invalid API key" },
      { status: 401 }
    ),
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
