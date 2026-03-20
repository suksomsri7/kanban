import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateOpenClaw, ocOk, ocError } from "@/lib/openclaw-auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ columnId: string }> }
) {
  const { columnId } = await params;
  const result = await authenticateOpenClaw(req, columnId, { allowPaused: true });
  if (result.error) return result.error;

  const column = await prisma.column.findUnique({
    where: { id: columnId },
    select: { automationStatus: true },
  });

  if (!column) return ocError("Column not found", 404);

  return ocOk({ automationStatus: column.automationStatus });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ columnId: string }> }
) {
  const { columnId } = await params;
  const result = await authenticateOpenClaw(req, columnId, { allowPaused: true });
  if (result.error) return result.error;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return ocError("Invalid JSON body");
  }

  const { automationStatus } = body as { automationStatus?: string };

  if (!automationStatus || !["run", "pause"].includes(automationStatus)) {
    return ocError('automationStatus must be "run" or "pause"');
  }

  const updated = await prisma.column.update({
    where: { id: columnId },
    data: { automationStatus },
    select: { automationStatus: true },
  });

  return ocOk({ automationStatus: updated.automationStatus });
}
