import { auth } from "@/lib/auth";
import { getBoardById } from "@/actions/board";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import BoardView from "@/components/board/BoardView";
import { getUserBoardPermissions } from "@/lib/permissions";
import type { SessionUser } from "@/types";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function BoardPage({ params }: Props) {
  // #region agent log
  const _bpStart = Date.now();
  // #endregion
  const { id } = await params;
  const session = await auth();
  const user = session!.user as SessionUser;

  const [board, permissions] = await Promise.all([
    getBoardById(id),
    getUserBoardPermissions(id),
  ]);

  if (!board) notFound();
  if (!permissions.hasAccess || !permissions.canView) notFound();

  const allUsers = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, displayName: true, username: true, avatar: true },
    orderBy: { displayName: "asc" },
  });

  // #region agent log
  const _bpElapsed = Date.now() - _bpStart;
  const _cardCount = board.columns.reduce((sum, c) => sum + c.cards.length, 0);
  console.log('[DBG-3e7644] BoardPage server render', {boardId:id, elapsed:_bpElapsed, columnCount:board.columns.length, cardCount:_cardCount, userCount:allUsers.length});
  // #endregion

  return <BoardView board={board} currentUser={user} allUsers={allUsers} permissions={permissions} />;
}
