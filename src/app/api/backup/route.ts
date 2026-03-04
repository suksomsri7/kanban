import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/types";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as SessionUser;
  if (user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Only Super Admin can export backups" }, { status: 403 });
  }

  const [users, projects, boards, columns, cards, labels, cardLabels, cardAssignees, subtasks, cardDependencies, comments, attachments, boardMembers, projectMembers, boardTemplates, notifications] = await Promise.all([
    prisma.user.findMany({ select: { id: true, username: true, passwordHash: true, displayName: true, avatar: true, role: true, isActive: true, createdAt: true } }),
    prisma.project.findMany(),
    prisma.board.findMany(),
    prisma.column.findMany(),
    prisma.card.findMany(),
    prisma.label.findMany(),
    prisma.cardLabel.findMany(),
    prisma.cardAssignee.findMany(),
    prisma.subtask.findMany(),
    prisma.cardDependency.findMany(),
    prisma.comment.findMany(),
    prisma.attachment.findMany(),
    prisma.boardMember.findMany(),
    prisma.projectMember.findMany(),
    prisma.boardTemplate.findMany(),
    prisma.notification.findMany(),
  ]);

  const backup = {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    exportedBy: user.displayName,
    data: {
      users,
      projects,
      boards,
      columns,
      cards,
      labels,
      cardLabels,
      cardAssignees,
      subtasks,
      cardDependencies,
      comments,
      attachments,
      boardMembers,
      projectMembers,
      boardTemplates,
      notifications,
    },
  };

  const json = JSON.stringify(backup, null, 2);

  return new NextResponse(json, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="kanban-backup-${new Date().toISOString().split("T")[0]}.json"`,
    },
  });
}
