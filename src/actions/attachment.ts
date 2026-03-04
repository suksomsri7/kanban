"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";
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

  revalidatePath(`/board/${boardId}`);
  return { success: true };
}

export async function deleteAttachment(attachmentId: string, boardId: string) {
  await requireAuth();

  await prisma.attachment.delete({ where: { id: attachmentId } });

  revalidatePath(`/board/${boardId}`);
  return { success: true };
}
