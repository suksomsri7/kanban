"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/actions/activity";
import { deleteFile } from "@/lib/storage";
import type { SessionUser } from "@/types";
import { requireBoardPermission } from "@/lib/permissions";

export async function createAttachmentRecord(
  cardId: string,
  fileName: string,
  fileUrl: string,
  fileSize: number,
  mimeType: string,
  boardId: string
) {
  const session = await requireAuth();
  const user = session.user as SessionUser;

  const { allowed, error: permErr } = await requireBoardPermission(boardId, user.id, user.role, "canUploadAttachment");
  if (!allowed) return { error: permErr || "Permission denied" };

  await prisma.attachment.create({
    data: {
      fileName,
      fileUrl,
      fileSize,
      mimeType,
      cardId,
      uploadedBy: user.id,
    },
  });

  await logActivity("ATTACHMENT_ADDED", boardId, user.id, { fileName }, cardId);

  revalidatePath(`/board/${boardId}`);
  return { success: true };
}

export async function deleteAttachment(attachmentId: string, boardId: string) {
  const session = await requireAuth();
  const user = session.user as SessionUser;

  const { allowed, error: permErr } = await requireBoardPermission(boardId, user.id, user.role, "canUploadAttachment");
  if (!allowed) return { error: permErr || "Permission denied" };

  const att = await prisma.attachment.findUnique({
    where: { id: attachmentId },
    select: { fileName: true, fileUrl: true, cardId: true },
  });

  if (att?.fileUrl) {
    try { await deleteFile(att.fileUrl); } catch { /* silent */ }
  }

  await prisma.attachment.delete({ where: { id: attachmentId } });
  await logActivity("ATTACHMENT_DELETED", boardId, user.id, { fileName: att?.fileName }, att?.cardId ?? undefined);

  revalidatePath(`/board/${boardId}`);
  return { success: true };
}
