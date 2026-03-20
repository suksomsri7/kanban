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
    select: { prompt: true, automationStatus: true },
  });

  if (!column) return ocError("Column not found", 404);

  return ocOk({
    prompt: column.prompt || "",
    automationStatus: column.automationStatus,
  });
}
