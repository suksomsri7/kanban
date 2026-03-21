import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashApiKey, type ApiKeyScope } from "@/lib/api-key";

export interface ApiUser {
  id: string;
  username: string;
  displayName: string;
  role: "SUPER_ADMIN" | "ADMIN" | "USER" | "GUEST";
  avatar: string | null;
}

export interface ApiAuthResult {
  user: ApiUser;
  scopes: ApiKeyScope[] | "all";
  apiKeyId?: string;
}

type AuthResult =
  | { auth: ApiAuthResult; error?: never }
  | { auth?: never; error: NextResponse };

export async function authenticateApi(req: NextRequest): Promise<AuthResult> {
  const xApiKey = req.headers.get("x-api-key");
  if (xApiKey) {
    return authenticateWithApiKey(xApiKey);
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    return authenticateWithBearerToken(token);
  }

  return {
    error: NextResponse.json(
      { success: false, error: "Missing authentication. Use x-api-key header or Authorization: Bearer <key>" },
      { status: 401 }
    ),
  };
}

async function authenticateWithApiKey(rawKey: string): Promise<AuthResult> {
  const keyHash = hashApiKey(rawKey);

  // #region agent log
  console.log('[DEBUG-3e7644] Main API auth attempt',JSON.stringify({keyPrefix:rawKey.slice(0,12),isAgentKey:rawKey.startsWith('agk_')}));
  fetch('http://127.0.0.1:7492/ingest/8743131b-3026-4056-b195-fc1daa1be99f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'3e7644'},body:JSON.stringify({sessionId:'3e7644',location:'api-auth.ts:authenticateWithApiKey',message:'Main API auth attempt',data:{keyPrefix:rawKey.slice(0,12),keyHashPrefix:keyHash.slice(0,12),isAgentKey:rawKey.startsWith('agk_')},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
  // #endregion

  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash },
    include: {
      user: {
        select: { id: true, username: true, displayName: true, role: true, avatar: true, isActive: true },
      },
    },
  });

  // #region agent log
  console.log('[DEBUG-3e7644] Main API key lookup result',JSON.stringify({found:!!apiKey,keyPrefix:rawKey.slice(0,12)}));
  fetch('http://127.0.0.1:7492/ingest/8743131b-3026-4056-b195-fc1daa1be99f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'3e7644'},body:JSON.stringify({sessionId:'3e7644',location:'api-auth.ts:authenticateWithApiKey',message:'Main API key lookup result',data:{found:!!apiKey,keyPrefix:rawKey.slice(0,12)},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
  // #endregion

  if (!apiKey) {
    return {
      error: NextResponse.json(
        { success: false, error: "Invalid API key" },
        { status: 401 }
      ),
    };
  }

  if (!apiKey.isActive) {
    return {
      error: NextResponse.json(
        { success: false, error: "API key is disabled" },
        { status: 403 }
      ),
    };
  }

  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return {
      error: NextResponse.json(
        { success: false, error: "API key has expired" },
        { status: 403 }
      ),
    };
  }

  if (!apiKey.user.isActive) {
    return {
      error: NextResponse.json(
        { success: false, error: "User account is disabled" },
        { status: 403 }
      ),
    };
  }

  prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  }).catch(() => {});

  const scopes = Array.isArray(apiKey.scopes) ? apiKey.scopes as ApiKeyScope[] : [];

  return {
    auth: {
      user: {
        id: apiKey.user.id,
        username: apiKey.user.username,
        displayName: apiKey.user.displayName,
        role: apiKey.user.role as ApiUser["role"],
        avatar: apiKey.user.avatar,
      },
      scopes,
      apiKeyId: apiKey.id,
    },
  };
}

async function authenticateWithBearerToken(token: string): Promise<AuthResult> {
  const keyHash = hashApiKey(token);
  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash },
    include: {
      user: {
        select: { id: true, username: true, displayName: true, role: true, avatar: true, isActive: true },
      },
    },
  });

  if (apiKey) {
    return authenticateWithApiKey(token);
  }

  const envApiKey = process.env.API_KEY?.trim();
  if (!envApiKey) {
    return {
      error: NextResponse.json(
        { success: false, error: "Invalid API key" },
        { status: 401 }
      ),
    };
  }

  if (token !== envApiKey) {
    return {
      error: NextResponse.json(
        { success: false, error: "Invalid API key" },
        { status: 401 }
      ),
    };
  }

  const agentUsername = (process.env.API_AGENT_USERNAME || "admin").trim();
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

  return {
    auth: {
      user: user as ApiUser,
      scopes: "all",
    },
  };
}

export function requireScope(auth: ApiAuthResult, scope: ApiKeyScope): NextResponse | null {
  if (auth.scopes === "all") return null;
  if (auth.scopes.includes(scope)) return null;
  return NextResponse.json(
    { success: false, error: `Insufficient permissions. Required scope: ${scope}` },
    { status: 403 }
  );
}

/** Pass if auth has "all" or any of the given scopes (for granular + backward-compat with :write). */
export function requireAnyScope(auth: ApiAuthResult, scopes: ApiKeyScope[]): NextResponse | null {
  if (auth.scopes === "all") return null;
  const has = scopes.some((s) => auth.scopes.includes(s));
  if (has) return null;
  return NextResponse.json(
    { success: false, error: `Insufficient permissions. Required one of: ${scopes.join(", ")}` },
    { status: 403 }
  );
}

export function jsonOk(data: unknown) {
  return NextResponse.json({ success: true, data });
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}
