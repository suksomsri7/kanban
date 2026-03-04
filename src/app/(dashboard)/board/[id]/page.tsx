import { auth } from "@/lib/auth";
import { getBoardById } from "@/actions/board";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import BoardView from "@/components/board/BoardView";
import type { SessionUser } from "@/types";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function BoardPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  const user = session!.user as SessionUser;
  const board = await getBoardById(id);

  if (!board) notFound();

  const allUsers = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, displayName: true, username: true, avatar: true },
    orderBy: { displayName: "asc" },
  });

  return <BoardView board={board} currentUser={user} allUsers={allUsers} />;
}
