import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateApi, requireAnyScope, jsonOk, jsonError } from "@/lib/api-auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; subtaskId: string }> }
) {
  const result = await authenticateApi(req);
  if (result.error) return result.error;
  const scopeErr = requireAnyScope(result.auth, ["subtasks:write", "subtasks:edit"]);
  if (scopeErr) return scopeErr;

  const { subtaskId } = await params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body");
  }

  const existing = await prisma.subtask.findUnique({ where: { id: subtaskId } });
  if (!existing) return jsonError("Subtask not found", 404);

  const { title, isCompleted } = body as { title?: string; isCompleted?: boolean };

  const data: Record<string, unknown> = {};
  if (title !== undefined) {
    if (!title.trim()) return jsonError("title cannot be empty");
    data.title = title.trim();
  }
  if (isCompleted !== undefined) data.isCompleted = !!isCompleted;

  if (Object.keys(data).length === 0) return jsonError("No fields to update");

  const subtask = await prisma.subtask.update({
    where: { id: subtaskId },
    data,
  });

  return jsonOk(subtask);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; subtaskId: string }> }
) {
  const result = await authenticateApi(req);
  if (result.error) return result.error;
  const scopeErr = requireAnyScope(result.auth, ["subtasks:write", "subtasks:delete"]);
  if (scopeErr) return scopeErr;

  const { subtaskId } = await params;

  const existing = await prisma.subtask.findUnique({ where: { id: subtaskId } });
  if (!existing) return jsonError("Subtask not found", 404);

  await prisma.subtask.delete({ where: { id: subtaskId } });

  return jsonOk({ deleted: true });
}
