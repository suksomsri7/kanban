import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/types";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as SessionUser;
  if (user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Only Super Admin can restore backups" }, { status: 403 });
  }

  let backup;
  try {
    backup = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!backup?.version || !backup?.data) {
    return NextResponse.json({ error: "Invalid backup format" }, { status: 400 });
  }

  const d = backup.data;

  try {
    // Clear existing data in reverse dependency order
    await prisma.notification.deleteMany();
    await prisma.activityLog.deleteMany();
    await prisma.cardDependency.deleteMany();
    await prisma.subtask.deleteMany();
    await prisma.attachment.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.cardLabel.deleteMany();
    await prisma.cardAssignee.deleteMany();
    await prisma.card.deleteMany();
    await prisma.column.deleteMany();
    await prisma.label.deleteMany();
    await prisma.boardMember.deleteMany();
    await prisma.board.deleteMany();
    await prisma.projectMember.deleteMany();
    await prisma.project.deleteMany();
    await prisma.boardTemplate.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany();

    // Restore in dependency order
    if (d.users?.length) {
      await prisma.user.createMany({ data: d.users, skipDuplicates: true });
    }
    if (d.projects?.length) {
      await prisma.project.createMany({ data: d.projects, skipDuplicates: true });
    }
    if (d.projectMembers?.length) {
      await prisma.projectMember.createMany({ data: d.projectMembers, skipDuplicates: true });
    }
    if (d.boardTemplates?.length) {
      await prisma.boardTemplate.createMany({ data: d.boardTemplates, skipDuplicates: true });
    }
    if (d.boards?.length) {
      await prisma.board.createMany({ data: d.boards, skipDuplicates: true });
    }
    if (d.boardMembers?.length) {
      await prisma.boardMember.createMany({ data: d.boardMembers, skipDuplicates: true });
    }
    if (d.columns?.length) {
      await prisma.column.createMany({ data: d.columns, skipDuplicates: true });
    }
    if (d.labels?.length) {
      await prisma.label.createMany({ data: d.labels, skipDuplicates: true });
    }
    if (d.cards?.length) {
      await prisma.card.createMany({ data: d.cards, skipDuplicates: true });
    }
    if (d.cardLabels?.length) {
      await prisma.cardLabel.createMany({ data: d.cardLabels, skipDuplicates: true });
    }
    if (d.cardAssignees?.length) {
      await prisma.cardAssignee.createMany({ data: d.cardAssignees, skipDuplicates: true });
    }
    if (d.subtasks?.length) {
      await prisma.subtask.createMany({ data: d.subtasks, skipDuplicates: true });
    }
    if (d.cardDependencies?.length) {
      await prisma.cardDependency.createMany({ data: d.cardDependencies, skipDuplicates: true });
    }
    if (d.comments?.length) {
      await prisma.comment.createMany({ data: d.comments, skipDuplicates: true });
    }
    if (d.attachments?.length) {
      await prisma.attachment.createMany({ data: d.attachments, skipDuplicates: true });
    }
    if (d.notifications?.length) {
      await prisma.notification.createMany({ data: d.notifications, skipDuplicates: true });
    }

    return NextResponse.json({
      success: true,
      message: `Restored: ${d.users?.length || 0} users, ${d.boards?.length || 0} boards, ${d.cards?.length || 0} cards`,
    });
  } catch (err) {
    console.error("Restore error:", err);
    return NextResponse.json({ error: "Restore failed. Database may be in inconsistent state." }, { status: 500 });
  }
}
