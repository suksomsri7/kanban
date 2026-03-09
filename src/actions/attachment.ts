"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/actions/activity";
import type { SessionUser } from "@/types";

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

  const att = await prisma.attachment.findUnique({
    where: { id: attachmentId },
    select: { fileName: true, cardId: true },
  });

  await prisma.attachment.delete({ where: { id: attachmentId } });
  await logActivity("ATTACHMENT_DELETED", boardId, user.id, { fileName: att?.fileName }, att?.cardId ?? undefined);

  revalidatePath(`/board/${boardId}`);
  return { success: true };
}
