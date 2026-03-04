import { auth } from "@/lib/auth";
import { getBoards, getBoardTemplates } from "@/actions/board";
import BoardList from "@/components/board/BoardList";
import type { SessionUser } from "@/types";

export default async function BoardsPage() {
  const session = await auth();
  const user = session!.user as SessionUser;
  const boards = await getBoards();
  const templates = await getBoardTemplates();
  const isAdmin = user.role === "SUPER_ADMIN" || user.role === "ADMIN";

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Boards</h1>
        <p className="text-gray-500 mt-1">Manage your boards</p>
      </div>
      <BoardList boards={boards} templates={templates} isAdmin={isAdmin} />
    </div>
  );
}
