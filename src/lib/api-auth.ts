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
  const authHeader = req.headers.get("authorization");

  // #region agent log — debug auth flow
  console.error(`[DEBUG-fcb7c3] authenticateApi: x-api-key=${xApiKey ? 'present' : 'absent'}, authorization=${authHeader ? authHeader.slice(0, 15) + '...' : 'absent'}`);
  // #endregion

  if (xApiKey) {
    const result = await authenticateWithApiKey(xApiKey);
    // #region agent log
    console.error(`[DEBUG-fcb7c3] authenticateWithApiKey result: ${result.error ? 'ERROR ' + result.error.status : 'OK user=' + result.auth?.user.username}`);
    // #endregion
    return result;
  }

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const result = await authenticateWithBearerToken(token);
    // #region agent log
    console.error(`[DEBUG-fcb7c3] authenticateWithBearerToken result: ${result.error ? 'ERROR' : 'OK user=' + result.auth?.user.username + ' scopes=' + result.auth?.scopes}`);
    // #endregion
    return result;
  }

  // #region agent log
  console.error('[DEBUG-fcb7c3] authenticateApi: no auth header found');
  // #endregion
  return {
    error: NextResponse.json(
      { success: false, error: "Missing authentication. Use x-api-key header or Authorization: Bearer <key>" },
      { status: 401 }
    ),
  };
}

async function authenticateWithApiKey(rawKey: string): Promise<AuthResult> {
  const keyHash = hashApiKey(rawKey);

  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash },
    include: {
      user: {
        select: { id: true, username: true, displayName: true, role: true, avatar: true, isActive: true },
      },
    },
  });

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
  // #region agent log
  console.error(`[DEBUG-fcb7c3] authenticateWithBearerToken: checking DB for hashed token...`);
  // #endregion

  const keyHash = hashApiKey(token);
  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash },
    include: {
      user: {
        select: { id: true, username: true, displayName: true, role: true, avatar: true, isActive: true },
      },
    },
  });

  // #region agent log
  console.error(`[DEBUG-fcb7c3] authenticateWithBearerToken: DB lookup result=${apiKey ? 'FOUND key=' + apiKey.id : 'NOT_FOUND'}`);
  // #endregion

  if (apiKey) {
    return authenticateWithApiKey(token);
  }

  const envApiKey = process.env.API_KEY;
  // #region agent log
  console.error(`[DEBUG-fcb7c3] authenticateWithBearerToken: envApiKey=${envApiKey ? 'SET(len=' + envApiKey.length + ')' : 'UNDEFINED'}, tokenMatch=${token === envApiKey}`);
  // #endregion

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

  const agentUsername = process.env.API_AGENT_USERNAME || "admin";
  // #region agent log
  console.error(`[DEBUG-fcb7c3] authenticateWithBearerToken: envKey matched! looking up user="${agentUsername}"`);
  // #endregion

  const user = await prisma.user.findUnique({
    where: { username: agentUsername },
    select: { id: true, username: true, displayName: true, role: true, avatar: true },
  });

  // #region agent log
  console.error(`[DEBUG-fcb7c3] authenticateWithBearerToken: user lookup=${user ? 'FOUND ' + user.username : 'NOT_FOUND'}`);
  // #endregion

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

export function jsonOk(data: unknown) {
  return NextResponse.json({ success: true, data });
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}
