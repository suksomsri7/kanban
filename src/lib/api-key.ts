import { randomBytes, createHash } from "crypto";

const KEY_PREFIX = "kbn_";
const KEY_BYTE_LENGTH = 32;

export const API_KEY_SCOPES = [
  "boards:read",
  "brands:read",
  "users:read",
  "cards:read",
  "cards:write",
  "cards:move",
  "comments:read",
  "comments:write",
  "subtasks:read",
  "subtasks:write",
] as const;

export type ApiKeyScope = (typeof API_KEY_SCOPES)[number];

export const SCOPE_LABELS: Record<ApiKeyScope, string> = {
  "boards:read": "View Boards",
  "brands:read": "View Brands",
  "users:read": "View Users",
  "cards:read": "View Cards",
  "cards:write": "Create / Edit / Delete Cards",
  "cards:move": "Move Cards",
  "comments:read": "View Comments",
  "comments:write": "Create Comments",
  "subtasks:read": "View Subtasks",
  "subtasks:write": "Create / Edit / Delete Subtasks",
};

export const SCOPE_GROUPS: { label: string; scopes: ApiKeyScope[] }[] = [
  { label: "Boards & Brands", scopes: ["boards:read", "brands:read"] },
  { label: "Users", scopes: ["users:read"] },
  { label: "Cards", scopes: ["cards:read", "cards:write", "cards:move"] },
  { label: "Comments", scopes: ["comments:read", "comments:write"] },
  { label: "Subtasks", scopes: ["subtasks:read", "subtasks:write"] },
];

export function generateApiKey(): { rawKey: string; keyHash: string; keyPrefix: string } {
  const raw = randomBytes(KEY_BYTE_LENGTH).toString("hex");
  const rawKey = `${KEY_PREFIX}${raw}`;
  return {
    rawKey,
    keyHash: hashApiKey(rawKey),
    keyPrefix: rawKey.slice(0, 12),
  };
}

export function hashApiKey(rawKey: string): string {
  return createHash("sha256").update(rawKey).digest("hex");
}

export function validateScopes(scopes: unknown): ApiKeyScope[] {
  if (!Array.isArray(scopes)) return [];
  return scopes.filter((s): s is ApiKeyScope =>
    typeof s === "string" && API_KEY_SCOPES.includes(s as ApiKeyScope)
  );
}
