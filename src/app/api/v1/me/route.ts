import { NextRequest } from "next/server";
import { authenticateApi, jsonOk } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const result = await authenticateApi(req);
  if (result.error) return result.error;

  const { user, scopes, apiKeyId } = result.auth;

  return jsonOk({
    user,
    scopes: scopes === "all" ? "all" : scopes,
    apiKeyId: apiKeyId ?? null,
  });
}
