import { randomBytes, createHash } from "crypto";

const KEY_PREFIX = "kbn_";
const KEY_BYTE_LENGTH = 32;

export const API_KEY_SCOPES = [
  "boards:read",
  "boards:write",
  "boards:create",
  "boards:edit",
  "boards:delete",
  "brands:read",
  "users:read",
  "cards:read",
  "cards:write",
  "cards:create",
  "cards:edit",
  "cards:delete",
  "cards:move",
  "comments:read",
  "comments:write",
  "comments:create",
  "comments:edit",
  "comments:delete",
  "subtasks:read",
  "subtasks:write",
  "subtasks:create",
  "subtasks:edit",
  "subtasks:delete",
] as const;

export type ApiKeyScope = (typeof API_KEY_SCOPES)[number];

export const SCOPE_LABELS: Record<ApiKeyScope, string> = {
  "boards:read": "View Boards",
  "boards:write": "Boards: Create + Edit + Delete (all)",
  "boards:create": "Boards: Create only",
  "boards:edit": "Boards: Edit only",
  "boards:delete": "Boards: Delete only",
  "brands:read": "View Brands",
  "users:read": "View Users",
  "cards:read": "View Cards",
  "cards:write": "Cards: Create + Edit + Delete (all)",
  "cards:create": "Cards: Create only",
  "cards:edit": "Cards: Edit only",
  "cards:delete": "Cards: Delete only",
  "cards:move": "Cards: Move between columns",
  "comments:read": "View Comments",
  "comments:write": "Comments: Create + Edit + Delete (all)",
  "comments:create": "Comments: Create only",
  "comments:edit": "Comments: Edit only",
  "comments:delete": "Comments: Delete only",
  "subtasks:read": "View Subtasks",
  "subtasks:write": "Subtasks: Create + Edit + Delete (all)",
  "subtasks:create": "Subtasks: Create only",
  "subtasks:edit": "Subtasks: Edit only",
  "subtasks:delete": "Subtasks: Delete only",
};

/** Groups for UI: only granular create/edit/delete (no combined :write). */
export const SCOPE_GROUPS: { label: string; scopes: ApiKeyScope[] }[] = [
  { label: "Boards & Brands", scopes: ["boards:read", "boards:create", "boards:edit", "boards:delete", "brands:read"] },
  { label: "Users", scopes: ["users:read"] },
  {
    label: "Cards",
    scopes: ["cards:read", "cards:create", "cards:edit", "cards:delete", "cards:move"],
  },
  {
    label: "Comments",
    scopes: ["comments:read", "comments:create", "comments:edit", "comments:delete"],
  },
  {
    label: "Subtasks",
    scopes: ["subtasks:read", "subtasks:create", "subtasks:edit", "subtasks:delete"],
  },
];

/** All scopes that appear in the UI (granular only; used for "Select all"). */
export const UI_SCOPES: ApiKeyScope[] = SCOPE_GROUPS.flatMap((g) => g.scopes);

/**
 * Expand :write scopes to create+edit+delete for display.
 * When loading an existing key that has cards:write, we show create+edit+delete as checked.
 */
export function expandWriteScopes(scopes: ApiKeyScope[]): ApiKeyScope[] {
  const out = new Set<ApiKeyScope>(scopes);
  if (scopes.includes("boards:write")) {
    out.add("boards:create");
    out.add("boards:edit");
    out.add("boards:delete");
  }
  if (scopes.includes("cards:write")) {
    out.add("cards:create");
    out.add("cards:edit");
    out.add("cards:delete");
  }
  if (scopes.includes("comments:write")) {
    out.add("comments:create");
    out.add("comments:edit");
    out.add("comments:delete");
  }
  if (scopes.includes("subtasks:write")) {
    out.add("subtasks:create");
    out.add("subtasks:edit");
    out.add("subtasks:delete");
  }
  return Array.from(out);
}

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
